"""
Prosodic/spectral feature extraction — VERBATIM from
apps/communicate/notebook-integration/_shared_features.py (FEATURE_SOURCE).

That file exists to prevent train/serve skew: EmotionClassifier.ipynb
(training) and this service (serving) must compute features identically, or
the classifier receives vectors that mean something different from the ones
it learned on and accuracy collapses silently. If you ever change this file,
change _shared_features.py too and retrain — never let the two diverge.

Only these two import lines were added; in the notebooks they came from an
earlier cell.
"""

import librosa
import numpy as np

# scipy ships with librosa, so this adds no dependency.
from scipy.signal import medfilt

# ── Framing ──
# Shared by pitch and energy so the two line up frame-for-frame and the voicing
# gate can index one against the other.
SAMPLE_RATE = 16000
FRAME_LENGTH = 1024
HOP_LENGTH = 256
# Human speech fundamental.
#
# The floor is 55 Hz, not the more common 65: a deep male voice speaking quietly
# — which is what sad delivery sounds like — drops into the 50s, and anything
# below the floor is discarded as unvoiced rather than measured. Set at 65, a
# low-pitched speaker loses precisely the frames that carry the emotion, and
# every pitch statistic is then computed from whatever survived.
#
# The ceiling stays at 400: above that is singing, not speech.
#
# This range is also why the pipeline is fast. librosa's own examples reach for
# `pyin` over C2-C7 (65-2093 Hz), which is a *music* range; measured on a 2 s
# clip that costs ~570 ms, about 90% of the whole feature pipeline. `yin` over
# the speech range does the same job in ~3 ms.
F0_MIN, F0_MAX = 55.0, 400.0


def _safe(x, default=0.0):
    """Feature values must be finite — sklearn refuses NaN, and one bad clip
    would otherwise take down the whole fit."""
    x = float(x) if x is not None else default
    return x if np.isfinite(x) else default


def _slope(values):
    """Linear trend over time. Falling pitch reads as sad or resigned; rising
    reads as surprised or questioning."""
    if len(values) < 2:
        return 0.0
    t = np.arange(len(values), dtype=np.float64)
    return _safe(np.polyfit(t, values, 1)[0])


# Longest silence kept between two bursts of speech, in seconds.
MAX_GAP_S = 0.35


def compact_speech(waveform, sr=SAMPLE_RATE, top_db=30, max_gap_s=MAX_GAP_S):
    """
    Keep the speech, cap the gaps between it.

    A recording is two things mixed together: how someone spoke, and how the
    recording was made. A fixed four-second capture window where the speaker
    talks for one and a half seconds is 60% dead air — and that dead air moves
    `silence_ratio`, `voiced_ratio`, `rms_cv`, `mfcc0_mean` and the onset-gap
    features by three to twenty-nine standard deviations. Set against UrduSER,
    which is tightly-cut broadcast dialogue, the two look like different
    domains when the only real difference is where somebody pressed stop.

    Trailing silence is pure artefact and goes entirely. Internal pauses are
    real prosody — sad speech genuinely pauses more — so they are kept but
    capped, which preserves *that a pause happened* and *roughly how many*
    without letting one long think-pause dominate every statistic.

    Returns the original if nothing above the threshold is found, so a quiet
    clip degrades rather than becoming empty.
    """
    if waveform.size == 0:
        return waveform
    intervals = librosa.effects.split(waveform, top_db=top_db)
    if len(intervals) == 0:
        return waveform

    max_gap = int(max_gap_s * sr)
    pieces, previous_end = [], None
    for start, end in intervals:
        if previous_end is not None:
            gap = min(start - previous_end, max_gap)
            if gap > 0:
                pieces.append(waveform[previous_end:previous_end + gap])
        pieces.append(waveform[start:end])
        previous_end = end

    compacted = np.concatenate(pieces) if pieces else waveform
    return compacted if compacted.size else waveform


def extract_features(waveform, sr=SAMPLE_RATE):
    """
    One clip -> one fixed-length vector of prosodic and spectral statistics.

    Each block maps to something a listener actually hears as emotion:

      pitch (F0)     : angry and happy sit higher and vary more; sad is flat
      energy (RMS)   : angry is loud with sharp attacks; sad is quiet
      rhythm         : sad is slow with long pauses; angry is fast and clipped
      voice quality  : spectral shape separates tense from breathy
      MFCC           : timbre, the general-purpose backstop

    Deliberately *not* normalised per speaker: doing so would leak test-speaker
    statistics into training under a speaker-independent split.

    ## Why the waveform is peak-normalised first

    Without it, `rms_mean`, `rms_max`, `rms_range`, `rms_std`, `rms_slope` and
    `mfcc0_mean` all scale with the raw recording level — measured, a x0.15
    gain change moves them by about 85%. Those were also the six features the
    model ranked most important, so most of its decision was really "how loud
    is this file".

    That is fine within one corpus, where the recording chain is constant and
    loudness genuinely correlates with anger. It is fatal across corpora:
    UrduSER is broadcast television audio, normalised and compressed to a peak
    near 1.0, while a laptop microphone is far quieter. A model trained on the
    former and served the latter reads every clip as low-energy and scores
    *below chance* — which is exactly what happened.

    Normalising to unit peak throws away absolute level and keeps the shape:
    how much the energy varies, where it rises and falls, how peaky it is
    against its own maximum. That is the part that actually carries emotion,
    and it survives a change of microphone.

    Done here rather than in `load_and_trim` on purpose — the serving path
    passes an already-decoded waveform straight to this function, so anything
    done outside it would apply during training and not during serving.
    """
    # Strip the recording protocol before measuring the speech: cap dead air,
    # then remove absolute level. See compact_speech() and the note above.
    waveform = compact_speech(waveform, sr)
    peak = float(np.max(np.abs(waveform))) if waveform.size else 0.0
    if peak > 1e-6:
        waveform = waveform / peak

    feats, names = [], []

    def add(name, value):
        names.append(name)
        feats.append(_safe(value))

    # ── energy (first: the voicing gate below needs it) ──
    rms = librosa.feature.rms(y=waveform, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)[0]

    # ── pitch ──
    f0 = librosa.yin(waveform, fmin=F0_MIN, fmax=F0_MAX, sr=sr,
                     frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)
    # yin reports a pitch for every frame including silence, so voiced frames
    # have to be found separately: loud enough to be speech, and with a pitch
    # not pinned to the edge of the search range (where yin lands when there is
    # nothing periodic to find).
    n_frames = min(len(f0), len(rms))
    f0, rms = f0[:n_frames], rms[:n_frames]
    loud_enough = rms > max(0.10 * float(np.max(rms)) if rms.size else 0.0, 1e-4)
    in_band = (f0 > F0_MIN * 1.02) & (f0 < F0_MAX * 0.98)
    voiced_flag = loud_enough & in_band
    voiced = f0[voiced_flag]

    # Pitch is described *relative to the speaker's own register*, never in
    # absolute hertz.
    #
    # Absolute F0 is mostly a fact about the speaker's body, not their mood.
    # UrduSER averages 200 Hz; a male Sinhala speaker sits near 100 Hz — about
    # two standard deviations below the corpus mean before he has expressed
    # anything at all. A model given raw hertz learns "low pitch means sad" and
    # then labels that speaker sad no matter how he performs.
    #
    # Dividing by the clip's own median keeps the part that carries emotion —
    # how far the voice ranges, how much it varies, which way it drifts — and
    # discards the part that is just anatomy. Standard practice in
    # cross-speaker emotion work, and the whole reason this can cross a
    # language boundary.
    # Everything below is measured in **semitones away from this clip's own
    # median pitch**, which makes it register-free by construction: scaling a
    # voice up or down an octave shifts every value by the same constant, and
    # subtracting the median removes it exactly.
    #
    # The contour is median-filtered first. `yin` occasionally reports a pitch
    # an octave out on a single frame, and while that barely moves a percentile
    # it badly corrupts anything built from extremes, standard deviations or
    # frame-to-frame differences — measured, those moved 27-63% under an octave
    # shift purely from which frames happened to glitch. A 5-frame median
    # filter removes the spikes without smoothing real intonation, which
    # changes over far longer spans.
    #
    # Spread is then reported from percentiles rather than min/max for the same
    # robustness reason.
    if voiced.size >= 2:
        smooth = medfilt(voiced, kernel_size=5) if voiced.size >= 5 else voiced
        median = float(np.median(smooth))
        semitones = 12.0 * np.log2(np.maximum(smooth, 1e-6) / max(median, 1e-6))
        p10, p25, p75, p90 = np.percentile(semitones, [10, 25, 75, 90])
        add("f0_st_std", np.std(semitones))
        add("f0_st_iqr", p75 - p25)
        add("f0_st_range", p90 - p10)
        add("f0_st_high", p90)
        add("f0_st_low", p10)
        add("f0_st_slope", _slope(semitones))
        # Frame-to-frame pitch jitter is deliberately NOT a feature. It is a
        # real voice-quality cue, but it lives at exactly the timescale that
        # lossy codecs alter: browser capture is Opus, UrduSER came off
        # YouTube, and the two encode micro-variation differently. Measured, it
        # was the only pitch feature still moving more than half a standard
        # deviation under a register change. A feature that tracks the codec
        # more than the speaker is worse than no feature.
        #
        # The one absolute value, kept for reporting. It is the speaker's
        # register — anatomy, not mood — and the model is free to ignore it.
        add("f0_median_hz", median)
    else:
        for n in ["f0_st_std","f0_st_iqr","f0_st_range","f0_st_high","f0_st_low",
                  "f0_st_slope","f0_median_hz"]:
            add(n, 0.0)
    add("voiced_ratio", np.mean(voiced_flag) if voiced_flag.size else 0.0)

    # ── energy statistics ──
    add("rms_mean", np.mean(rms))
    add("rms_std", np.std(rms))
    add("rms_max", np.max(rms))
    add("rms_range", np.ptp(rms))
    add("rms_slope", _slope(rms))
    add("rms_cv", np.std(rms) / max(np.mean(rms), 1e-6))

    # ── rhythm ──
    duration = len(waveform) / sr
    add("duration", duration)
    # Silence share and pause rate stand in for speaking rate without needing a
    # word count. Sad speech pauses more, and for longer.
    threshold = 0.15 * np.mean(rms) if np.mean(rms) > 0 else 0.0
    quiet = rms < threshold
    add("silence_ratio", np.mean(quiet))
    add("pause_count", int(np.sum(np.abs(np.diff(quiet.astype(int))))) / max(duration, 1e-6))
    # Onsets per second: a direct proxy for syllable rate.
    onsets = librosa.onset.onset_detect(y=waveform, sr=sr, units="time")
    add("onset_rate", len(onsets) / max(duration, 1e-6))
    if len(onsets) > 1:
        gaps = np.diff(onsets)
        add("onset_gap_mean", np.mean(gaps))
        add("onset_gap_std", np.std(gaps))
    else:
        add("onset_gap_mean", 0.0)
        add("onset_gap_std", 0.0)

    # ── voice quality ──
    add("centroid_mean", np.mean(librosa.feature.spectral_centroid(y=waveform, sr=sr)[0]))
    add("centroid_std", np.std(librosa.feature.spectral_centroid(y=waveform, sr=sr)[0]))
    rolloff = librosa.feature.spectral_rolloff(y=waveform, sr=sr)[0]
    add("rolloff_mean", np.mean(rolloff))
    add("rolloff_std", np.std(rolloff))
    add("bandwidth_mean", np.mean(librosa.feature.spectral_bandwidth(y=waveform, sr=sr)[0]))
    zcr = librosa.feature.zero_crossing_rate(waveform)[0]
    add("zcr_mean", np.mean(zcr))
    add("zcr_std", np.std(zcr))
    add("flatness_mean", np.mean(librosa.feature.spectral_flatness(y=waveform)[0]))

    # ── timbre ──
    mfcc = librosa.feature.mfcc(y=waveform, sr=sr, n_mfcc=13)
    for i in range(13):
        add(f"mfcc{i}_mean", np.mean(mfcc[i]))
        add(f"mfcc{i}_std", np.std(mfcc[i]))
    # Deltas capture *change* in timbre — articulation sharpness.
    delta = librosa.feature.delta(mfcc)
    for i in range(13):
        add(f"mfcc{i}_delta_mean", np.mean(np.abs(delta[i])))

    return np.array(feats, dtype=np.float64), names


def load_and_trim(path, sr=SAMPLE_RATE):
    """Decode, downmix, resample, and strip leading/trailing silence.

    Trimming matters more than it looks: recordings carry dead air from the
    record button, and `silence_ratio` and `duration` would otherwise measure
    the operator's reflexes rather than the speaker's delivery. UrduSER ships
    at 44.1 kHz; librosa resamples to 16 kHz here so training and serving see
    identical input.
    """
    waveform, _ = librosa.load(path, sr=sr, mono=True)
    waveform, _ = librosa.effects.trim(waveform, top_db=30)
    return waveform.astype(np.float32)
