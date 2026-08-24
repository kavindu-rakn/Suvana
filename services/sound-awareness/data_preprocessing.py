"""
══════════════════════════════════════════════════════════════════════
SoundGuard — Audio Data Preprocessing Pipeline
══════════════════════════════════════════════════════════════════════

PURPOSE
-------
This script is the first stage of the SoundGuard Edge-AI pipeline.
It converts raw .wav audio files into Mel-spectrogram and MFCC feature
arrays suitable for training a lightweight CNN classifier.

The trained model will later be:
  1. Quantized with TensorFlow Lite (int8 / float16)
  2. Deployed on-device via React Native (Expo) for real-time inference

EXPECTED FOLDER STRUCTURE
-------------------------
    raw_audio/
    ├── ambulance_siren/
    │   ├── clip_001.wav
    │   ├── clip_002.wav
    │   └── ...
    ├── car_horn/
    │   ├── clip_001.wav
    │   └── ...
    ├── dog_bark/
    ├── glass_breaking/
    ├── gunshot/
    ├── smoke_alarm/
    ├── footsteps/
    ├── doorbell/
    ├── thunder/
    └── construction_drill/

Each subfolder name becomes the class label. This follows the convention
used by datasets like ESC-50 and UrbanSound8K.

OUTPUT
------
    processed_data/
    ├── X_mel.npy          — Mel-spectrogram features  (N, 128, 128, 1)
    ├── X_mfcc.npy         — MFCC features             (N, 40, 128, 1)
    ├── y_labels.npy       — Integer-encoded labels     (N,)
    ├── label_map.json     — {0: "ambulance_siren", 1: "car_horn", ...}
    └── preprocessing_report.json

EDGE-AI CONSIDERATIONS
----------------------
• Fixed input shape (128×128×1 for Mel, 40×128×1 for MFCC) chosen to fit
  within mobile inference constraints (< 5 MB model, < 50ms latency).
• Audio is resampled to 22050 Hz (librosa default) — matches what the
  mobile microphone will capture at runtime.
• All clips are zero-padded or truncated to exactly CLIP_DURATION seconds
  to ensure uniform tensor shapes for batched training.
• Mel-spectrograms use 128 Mel bands with log-power scaling, which has
  shown strong performance on environmental sound classification tasks.

USAGE
-----
    python data_preprocessing.py
    python data_preprocessing.py --input_dir ./raw_audio --duration 3.0
    python data_preprocessing.py --feature_type both --augment

══════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import argparse
import warnings
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np

# Suppress non-critical warnings during batch processing
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# ──────────────────────────────────────────────────────────────────
# Lazy imports — these are heavy libraries, only load when needed
# ──────────────────────────────────────────────────────────────────

def _import_librosa():
    """Lazy-import librosa to keep CLI --help fast."""
    try:
        import librosa
        return librosa
    except ImportError:
        print("ERROR: librosa is not installed.")
        print("  Run:  pip install -r requirements.txt")
        sys.exit(1)


def _import_sklearn():
    """Lazy-import scikit-learn for label encoding."""
    try:
        from sklearn.preprocessing import LabelEncoder
        return LabelEncoder
    except ImportError:
        print("ERROR: scikit-learn is not installed.")
        print("  Run:  pip install -r requirements.txt")
        sys.exit(1)


# ──────────────────────────────────────────────────────────────────
# Constants — tuned for Edge-AI / TFLite deployment constraints
# ──────────────────────────────────────────────────────────────────

# Audio parameters
SAMPLE_RATE = 22050          # Standard rate — matches librosa default
CLIP_DURATION = 3.0          # Seconds — each clip is padded/truncated to this
CLIP_SAMPLES = int(SAMPLE_RATE * CLIP_DURATION)  # 66150 samples

# Mel-spectrogram parameters
N_MELS = 128                 # Number of Mel frequency bands
N_FFT = 2048                 # FFT window size
HOP_LENGTH = 512             # Hop between FFT frames
MEL_SPEC_WIDTH = 128         # Target time-axis width (frames)

# MFCC parameters
N_MFCC = 40                  # Number of MFCC coefficients
MFCC_WIDTH = 128             # Target time-axis width (frames)

# Supported audio formats
AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}


# ──────────────────────────────────────────────────────────────────
# Core Feature Extraction Functions
# ──────────────────────────────────────────────────────────────────

def load_and_normalize_audio(
    file_path: str,
    sr: int = SAMPLE_RATE,
    duration: float = CLIP_DURATION,
) -> Optional[np.ndarray]:
    """
    Load an audio file, resample to target rate, and normalize to
    a fixed length via zero-padding or truncation.

    This ensures every input tensor has identical dimensions —
    critical for batched CNN training and TFLite's fixed-shape requirement.

    Parameters
    ----------
    file_path : str
        Path to the audio file (.wav, .mp3, etc.)
    sr : int
        Target sample rate (default: 22050 Hz)
    duration : float
        Target clip duration in seconds (default: 3.0s)

    Returns
    -------
    np.ndarray or None
        1-D float32 array of shape (sr * duration,), or None on failure.
    """
    librosa = _import_librosa()
    target_length = int(sr * duration)

    try:
        # Load audio — mono, resampled to target sr
        y, _ = librosa.load(file_path, sr=sr, mono=True)

        # Normalize amplitude to [-1, 1] range
        peak = np.max(np.abs(y))
        if peak > 0:
            y = y / peak

        # Pad or truncate to exact target length
        if len(y) < target_length:
            # Zero-pad short clips (silence padding)
            y = np.pad(y, (0, target_length - len(y)), mode="constant")
        else:
            # Truncate long clips (center crop for better representation)
            start = (len(y) - target_length) // 2
            y = y[start : start + target_length]

        return y.astype(np.float32)

    except Exception as e:
        print(f"  ⚠ Failed to load: {file_path}")
        print(f"    Reason: {e}")
        return None


def extract_mel_spectrogram(
    y: np.ndarray,
    sr: int = SAMPLE_RATE,
    n_mels: int = N_MELS,
    n_fft: int = N_FFT,
    hop_length: int = HOP_LENGTH,
    target_width: int = MEL_SPEC_WIDTH,
) -> np.ndarray:
    """
    Convert a waveform to a log-scaled Mel-spectrogram.

    The Mel scale approximates human auditory perception, making it
    ideal for sound classification. Log-power scaling compresses the
    dynamic range — important for the limited precision of quantized
    TFLite models (int8).

    Output shape: (n_mels, target_width, 1) — ready for CNN input.

    Parameters
    ----------
    y : np.ndarray
        1-D waveform array
    sr : int
        Sample rate
    n_mels : int
        Number of Mel bands (frequency axis height)
    n_fft : int
        FFT window size
    hop_length : int
        Hop size between STFT frames
    target_width : int
        Fixed number of time frames (width axis)

    Returns
    -------
    np.ndarray
        Shape (n_mels, target_width, 1), float32, normalized to [0, 1]
    """
    librosa = _import_librosa()

    # Compute Mel-spectrogram (power spectrum)
    mel_spec = librosa.feature.melspectrogram(
        y=y, sr=sr, n_mels=n_mels, n_fft=n_fft, hop_length=hop_length
    )

    # Convert power to log scale (dB) — critical for neural network input
    # ref=np.max normalizes relative to the peak, preventing overflow
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

    # Normalize to [0, 1] range for stable training
    mel_spec_db = (mel_spec_db - mel_spec_db.min()) / (
        mel_spec_db.max() - mel_spec_db.min() + 1e-8
    )

    # Resize time axis to fixed width (pad or truncate)
    if mel_spec_db.shape[1] < target_width:
        pad_width = target_width - mel_spec_db.shape[1]
        mel_spec_db = np.pad(mel_spec_db, ((0, 0), (0, pad_width)), mode="constant")
    else:
        mel_spec_db = mel_spec_db[:, :target_width]

    # Add channel dimension for CNN: (n_mels, width) → (n_mels, width, 1)
    return mel_spec_db[:, :, np.newaxis].astype(np.float32)


def extract_mfcc(
    y: np.ndarray,
    sr: int = SAMPLE_RATE,
    n_mfcc: int = N_MFCC,
    n_fft: int = N_FFT,
    hop_length: int = HOP_LENGTH,
    target_width: int = MFCC_WIDTH,
) -> np.ndarray:
    """
    Extract Mel-Frequency Cepstral Coefficients (MFCCs).

    MFCCs capture the spectral envelope shape — essentially a compact
    "fingerprint" of the audio's timbral qualities. They complement
    Mel-spectrograms and are lighter-weight, making them suitable for
    a secondary or fallback feature set on resource-constrained devices.

    Output shape: (n_mfcc, target_width, 1) — ready for CNN input.

    Parameters
    ----------
    y : np.ndarray
        1-D waveform array
    sr : int
        Sample rate
    n_mfcc : int
        Number of MFCC coefficients (frequency axis height)
    n_fft : int
        FFT window size
    hop_length : int
        Hop size between STFT frames
    target_width : int
        Fixed number of time frames (width axis)

    Returns
    -------
    np.ndarray
        Shape (n_mfcc, target_width, 1), float32, standardized
    """
    librosa = _import_librosa()

    # Extract MFCCs
    mfccs = librosa.feature.mfcc(
        y=y, sr=sr, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length
    )

    # Standardize (zero mean, unit variance) per coefficient
    # This is crucial for convergence during CNN training
    mean = np.mean(mfccs, axis=1, keepdims=True)
    std = np.std(mfccs, axis=1, keepdims=True) + 1e-8
    mfccs = (mfccs - mean) / std

    # Resize time axis to fixed width
    if mfccs.shape[1] < target_width:
        pad_width = target_width - mfccs.shape[1]
        mfccs = np.pad(mfccs, ((0, 0), (0, pad_width)), mode="constant")
    else:
        mfccs = mfccs[:, :target_width]

    # Add channel dimension: (n_mfcc, width) → (n_mfcc, width, 1)
    return mfccs[:, :, np.newaxis].astype(np.float32)


# ──────────────────────────────────────────────────────────────────
# Data Augmentation (optional — improves model robustness)
# ──────────────────────────────────────────────────────────────────

def augment_waveform(y: np.ndarray, sr: int = SAMPLE_RATE) -> List[np.ndarray]:
    """
    Apply simple audio augmentations to increase dataset diversity.

    For Edge-AI, we want the model to be robust against:
      • Background noise (noisy environments)
      • Volume variations (distance from sound source)
      • Slight pitch shifts (Doppler effect on moving vehicles)

    Parameters
    ----------
    y : np.ndarray
        Original waveform
    sr : int
        Sample rate

    Returns
    -------
    List[np.ndarray]
        List of augmented waveforms (does NOT include the original)
    """
    librosa = _import_librosa()
    augmented = []

    # 1. Add Gaussian noise (simulates noisy environment)
    noise_factor = 0.005
    noise = np.random.normal(0, noise_factor, y.shape).astype(np.float32)
    augmented.append(np.clip(y + noise, -1.0, 1.0))

    # 2. Time stretch (slight speed variation, ±10%)
    try:
        stretched = librosa.effects.time_stretch(y, rate=1.1)
        # Re-normalize to target length
        target_len = len(y)
        if len(stretched) < target_len:
            stretched = np.pad(stretched, (0, target_len - len(stretched)))
        else:
            stretched = stretched[:target_len]
        augmented.append(stretched.astype(np.float32))
    except Exception:
        pass  # Skip if time_stretch fails

    # 3. Volume scaling (±20% gain — simulates distance)
    gain = np.random.uniform(0.8, 1.2)
    augmented.append(np.clip(y * gain, -1.0, 1.0).astype(np.float32))

    return augmented


# ──────────────────────────────────────────────────────────────────
# Dataset Scanner & Processor
# ──────────────────────────────────────────────────────────────────

def scan_dataset(input_dir: str) -> Tuple[List[str], List[str], Dict[int, str]]:
    """
    Scan the raw_audio/ directory and discover all audio files + labels.

    Parameters
    ----------
    input_dir : str
        Path to the root audio directory (e.g., './raw_audio')

    Returns
    -------
    file_paths : List[str]
        Absolute paths to all discovered audio files
    labels : List[str]
        Corresponding class labels (subfolder names)
    label_map : Dict[int, str]
        Mapping from integer index to class name
    """
    input_path = Path(input_dir)

    if not input_path.exists():
        print(f"ERROR: Input directory not found: {input_dir}")
        print(f"  Expected structure:")
        print(f"    {input_dir}/")
        print(f"    ├── ambulance_siren/")
        print(f"    │   ├── clip_001.wav")
        print(f"    │   └── ...")
        print(f"    ├── car_horn/")
        print(f"    └── ...")
        sys.exit(1)

    file_paths = []
    labels = []

    # Discover class folders
    class_dirs = sorted([
        d for d in input_path.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ])

    if not class_dirs:
        print(f"ERROR: No class subdirectories found in {input_dir}")
        sys.exit(1)

    # Build label map: {0: "ambulance_siren", 1: "car_horn", ...}
    class_names = [d.name for d in class_dirs]
    label_map = {i: name for i, name in enumerate(class_names)}

    print(f"\n{'═' * 60}")
    print(f"  DATASET SCAN RESULTS")
    print(f"{'═' * 60}")
    print(f"  Source directory : {input_path.resolve()}")
    print(f"  Classes found   : {len(class_names)}")
    print()

    for class_dir in class_dirs:
        class_name = class_dir.name

        # Find all audio files in this class folder
        audio_files = sorted([
            f for f in class_dir.iterdir()
            if f.is_file() and f.suffix.lower() in AUDIO_EXTENSIONS
        ])

        count = len(audio_files)
        print(f"  [{class_name:.<30s}] {count:>4d} files")

        for f in audio_files:
            file_paths.append(str(f))
            labels.append(class_name)

    total = len(file_paths)
    print(f"\n  {'TOTAL':.<30s}  {total:>4d} files")
    print(f"{'═' * 60}\n")

    if total == 0:
        print("ERROR: No audio files found. Supported formats:", AUDIO_EXTENSIONS)
        sys.exit(1)

    return file_paths, labels, label_map


def process_dataset(
    file_paths: List[str],
    labels: List[str],
    label_map: Dict[int, str],
    output_dir: str = "./processed_data",
    feature_type: str = "both",
    duration: float = CLIP_DURATION,
    augment: bool = False,
) -> None:
    """
    Main processing pipeline — loads audio, extracts features, saves arrays.

    This is the heart of the preprocessing pipeline. For each audio file:
      1. Load and normalize the waveform
      2. (Optional) Generate augmented copies
      3. Extract Mel-spectrogram and/or MFCC features
      4. Collect into NumPy arrays
      5. Save to disk as .npy files

    The output arrays are directly consumable by a TensorFlow/Keras CNN:
      model.fit(X_mel, y_labels, ...)

    Parameters
    ----------
    file_paths : List[str]
        Paths to all audio files
    labels : List[str]
        Corresponding class labels
    label_map : Dict[int, str]
        Integer-to-class-name mapping
    output_dir : str
        Directory to save processed .npy arrays
    feature_type : str
        "mel", "mfcc", or "both"
    duration : float
        Target clip duration in seconds
    augment : bool
        Whether to apply data augmentation
    """
    # Try importing tqdm for progress bars
    try:
        from tqdm import tqdm
    except ImportError:
        # Fallback — no progress bar
        tqdm = None

    # Reverse label map: class_name → integer
    name_to_idx = {v: k for k, v in label_map.items()}

    # Storage
    mel_features = []
    mfcc_features = []
    encoded_labels = []
    failed_files = []

    total = len(file_paths)
    print(f"  Processing {total} audio files...")
    print(f"  Feature type  : {feature_type}")
    print(f"  Clip duration : {duration}s ({int(SAMPLE_RATE * duration)} samples)")
    print(f"  Augmentation  : {'ON (3x multiplier)' if augment else 'OFF'}")
    print()

    # Create iterator with optional progress bar
    items = list(zip(file_paths, labels))
    if tqdm:
        iterator = tqdm(items, desc="  Extracting", unit="file", ncols=70)
    else:
        iterator = items

    processed_count = 0

    for file_path, label in iterator:
        # Load audio
        y = load_and_normalize_audio(file_path, sr=SAMPLE_RATE, duration=duration)
        if y is None:
            failed_files.append(file_path)
            continue

        # Collect all waveforms to process (original + augmented)
        waveforms = [y]
        if augment:
            waveforms.extend(augment_waveform(y, sr=SAMPLE_RATE))

        label_idx = name_to_idx[label]

        for waveform in waveforms:
            # Extract features based on requested type
            if feature_type in ("mel", "both"):
                mel = extract_mel_spectrogram(waveform, sr=SAMPLE_RATE)
                mel_features.append(mel)

            if feature_type in ("mfcc", "both"):
                mfcc = extract_mfcc(waveform, sr=SAMPLE_RATE)
                mfcc_features.append(mfcc)

            encoded_labels.append(label_idx)

        processed_count += 1

    # ── Convert to NumPy arrays ──
    print(f"\n  Converting to NumPy arrays...")

    y_labels = np.array(encoded_labels, dtype=np.int32)

    # ── Save to disk ──
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if mel_features:
        X_mel = np.array(mel_features, dtype=np.float32)
        mel_path = output_path / "X_mel.npy"
        np.save(str(mel_path), X_mel)
        print(f"  ✓ Mel-spectrograms : {mel_path}  shape={X_mel.shape}")

    if mfcc_features:
        X_mfcc = np.array(mfcc_features, dtype=np.float32)
        mfcc_path = output_path / "X_mfcc.npy"
        np.save(str(mfcc_path), X_mfcc)
        print(f"  ✓ MFCCs            : {mfcc_path}  shape={X_mfcc.shape}")

    labels_path = output_path / "y_labels.npy"
    np.save(str(labels_path), y_labels)
    print(f"  ✓ Labels           : {labels_path}  shape={y_labels.shape}")

    # Save label map as JSON
    label_map_path = output_path / "label_map.json"
    with open(str(label_map_path), "w") as f:
        json.dump(label_map, f, indent=2)
    print(f"  ✓ Label map        : {label_map_path}")

    # ── Generate preprocessing report ──
    report = {
        "timestamp": datetime.now().isoformat(),
        "pipeline_version": "1.0.0",
        "input_directory": str(Path(file_paths[0]).parent.parent.resolve()) if file_paths else "N/A",
        "output_directory": str(output_path.resolve()),
        "parameters": {
            "sample_rate": SAMPLE_RATE,
            "clip_duration_seconds": duration,
            "clip_samples": int(SAMPLE_RATE * duration),
            "n_mels": N_MELS,
            "n_mfcc": N_MFCC,
            "n_fft": N_FFT,
            "hop_length": HOP_LENGTH,
            "feature_type": feature_type,
            "augmentation_enabled": augment,
        },
        "dataset_stats": {
            "total_files_scanned": total,
            "files_processed": processed_count,
            "files_failed": len(failed_files),
            "total_samples_generated": len(encoded_labels),
            "num_classes": len(label_map),
            "class_distribution": {
                name: int(np.sum(y_labels == idx))
                for idx, name in label_map.items()
            },
        },
        "output_shapes": {
            "mel_spectrogram": list(X_mel.shape) if mel_features else None,
            "mfcc": list(X_mfcc.shape) if mfcc_features else None,
            "labels": list(y_labels.shape),
        },
        "failed_files": failed_files[:20],  # Cap at 20 entries
        "edge_ai_notes": {
            "target_framework": "TensorFlow Lite",
            "quantization_plan": "int8 post-training quantization",
            "target_model_size": "< 5 MB",
            "target_inference_latency": "< 50ms on mobile",
        },
    }

    report_path = output_path / "preprocessing_report.json"
    with open(str(report_path), "w") as f:
        json.dump(report, f, indent=2)

    # ── Summary ──
    print(f"\n{'═' * 60}")
    print(f"  PREPROCESSING COMPLETE")
    print(f"{'═' * 60}")
    print(f"  Files processed    : {processed_count}/{total}")
    print(f"  Files failed       : {len(failed_files)}")
    print(f"  Total samples      : {len(encoded_labels)}")
    print(f"  Classes            : {len(label_map)}")
    if mel_features:
        print(f"  Mel shape          : {X_mel.shape}")
    if mfcc_features:
        print(f"  MFCC shape         : {X_mfcc.shape}")
    print(f"  Output directory   : {output_path.resolve()}")
    print(f"  Report             : {report_path}")
    print(f"{'═' * 60}\n")

    if failed_files:
        print(f"  ⚠ {len(failed_files)} file(s) failed to process:")
        for fp in failed_files[:5]:
            print(f"    - {fp}")
        if len(failed_files) > 5:
            print(f"    ... and {len(failed_files) - 5} more (see report)")
        print()


# ──────────────────────────────────────────────────────────────────
# CLI Entry Point
# ──────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="SoundGuard — Audio Data Preprocessing for Edge-AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python data_preprocessing.py
  python data_preprocessing.py --input_dir ./my_audio --output_dir ./features
  python data_preprocessing.py --feature_type mfcc --duration 2.5
  python data_preprocessing.py --augment --feature_type both
        """,
    )

    parser.add_argument(
        "--input_dir",
        type=str,
        default="./raw_audio",
        help="Path to raw audio directory (default: ./raw_audio)",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="./processed_data",
        help="Path to save processed features (default: ./processed_data)",
    )
    parser.add_argument(
        "--feature_type",
        type=str,
        choices=["mel", "mfcc", "both"],
        default="both",
        help="Type of features to extract (default: both)",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=CLIP_DURATION,
        help=f"Target clip duration in seconds (default: {CLIP_DURATION})",
    )
    parser.add_argument(
        "--augment",
        action="store_true",
        help="Enable data augmentation (noise, stretch, volume)",
    )

    return parser.parse_args()


def main() -> None:
    """Main entry point."""
    args = parse_args()

    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║          SoundGuard — Data Preprocessing Pipeline       ║")
    print("║          Edge-AI Audio Feature Extraction                ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()

    # Step 1: Scan the dataset
    file_paths, labels, label_map = scan_dataset(args.input_dir)

    # Step 2: Process and extract features
    process_dataset(
        file_paths=file_paths,
        labels=labels,
        label_map=label_map,
        output_dir=args.output_dir,
        feature_type=args.feature_type,
        duration=args.duration,
        augment=args.augment,
    )


if __name__ == "__main__":
    main()
