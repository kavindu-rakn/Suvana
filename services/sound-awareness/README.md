# SoundGuard — Edge-AI Backend

Machine learning pipeline for environmental sound classification.

## Quick Start

```bash
cd sound_awareness_backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Directory Structure

```
sound_awareness_backend/
├── data_preprocessing.py     # Audio → feature extraction pipeline
├── requirements.txt          # Python dependencies
├── README.md
├── .gitignore
├── raw_audio/                # Place training data here (git-ignored)
│   ├── ambulance_siren/
│   ├── car_horn/
│   └── ...
└── processed_data/           # Output features (git-ignored)
    ├── X_mel.npy
    ├── X_mfcc.npy
    ├── y_labels.npy
    └── label_map.json
```

## Usage

```bash
# Default — scans ./raw_audio, extracts both Mel + MFCC
python data_preprocessing.py

# Custom paths
python data_preprocessing.py --input_dir ./my_audio --output_dir ./features

# MFCC only, 2.5s clips, with augmentation
python data_preprocessing.py --feature_type mfcc --duration 2.5 --augment
```

## Pipeline → TFLite

1. **Preprocess** → `data_preprocessing.py` (this script)
2. **Train CNN** → (coming next)
3. **Export** → TensorFlow SavedModel → TFLite (int8 quantized)
4. **Deploy** → React Native (Expo) on-device inference
