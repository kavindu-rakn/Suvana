/**
 * Browser recording for the emotion dataset.
 *
 * Kept out of the component because two details here are not cosmetic — they
 * decide whether the recordings are usable at all.
 */

export interface Take {
  /** Mono float samples at `sampleRate`, already resampled. */
  pcm: Float32Array;
  sampleRate: number;
  /** Highest absolute sample, for spotting silent or clipped takes. */
  peak: number;
}

/** What the training pipeline expects; also keeps the uploads small. */
export const TARGET_RATE = 16000;

/**
 * Opens the microphone with the browser's voice-call processing switched off.
 *
 * Chrome enables automatic gain control, noise suppression and echo
 * cancellation by default. All three exist to make speech *uniform* for a
 * phone call — compressing loudness differences and smoothing spectral
 * detail. That is precisely the signal an emotion classifier reads, so
 * leaving them on would strip the emotion out before the file is written.
 */
async function openMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
      channelCount: 1,
    },
  });
}

function beep(frequency: number, ms: number) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  osc.start();
  osc.stop(ctx.currentTime + ms / 1000);
  setTimeout(() => void ctx.close(), ms + 150);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function recordTake({
  seconds,
  countdown,
  onCountdown,
  onRecording,
}: {
  seconds: number;
  countdown: number;
  onCountdown: (remaining: number) => void;
  onRecording: (remaining: number) => void;
}): Promise<Take> {
  // The microphone is opened *before* the countdown, not after. Granting and
  // opening a device can take a second or more, and if the countdown runs
  // first the speaker starts talking into a microphone that is not yet
  // listening — losing the front of every sentence.
  const stream = await openMic();

  try {
    for (let i = countdown; i > 0; i--) {
      onCountdown(i);
      beep(440, 90);
      await wait(1000);
    }

    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    beep(880, 180); // high = start

    for (let left = seconds; left > 0; left--) {
      onRecording(left);
      await wait(1000);
    }

    recorder.stop();
    beep(330, 260); // low = stop
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const decoded = await decode(new Blob(chunks));
    let peak = 0;
    for (const v of decoded) peak = Math.max(peak, Math.abs(v));
    return { pcm: decoded, sampleRate: TARGET_RATE, peak };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

/**
 * MediaRecorder hands back WebM/Opus. Decode it and resample to 16 kHz mono.
 *
 * Re-encoding rather than uploading the browser's native format is required,
 * not tidiness: the training pipeline reads audio with libsndfile, which has
 * no Opus decoder and cannot open a WebM container at all.
 */
async function decode(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close();
  }

  const frames = Math.max(1, Math.ceil(buffer.duration * TARGET_RATE));
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/** 16-bit PCM WAV. Returns the raw buffer, which is directly Blob-able. */
export function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const bytes = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(bytes);
  const text = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  text(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, pcm.length * 2, true);

  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}
