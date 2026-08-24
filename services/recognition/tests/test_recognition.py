import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from data_preprocessing.frame_extractor import (
    FrameExtractor,
    NUM_FACE_LANDMARKS,
    NUM_HAND_LANDMARKS,
    NUM_LANDMARK_FEATURES,
)
from model.lstm_model import LSTMRecognizer


def test_frame_extractor_returns_expected_feature_vector_size():
    config = {
        "video": {
            "frame_height": 224,
            "frame_width": 224,
            "frames_per_sequence": 30,
            "fps": 30,
        },
        "model": {"sequence_length": 30},
        "dataset": {"num_classes": 50},
    }

    extractor = FrameExtractor(config)
    frame = np.zeros((224, 224, 3), dtype=np.uint8)
    features = extractor.extract_keypoints(frame)

    assert features.shape == (NUM_LANDMARK_FEATURES,)


def test_frame_extractor_uses_fixed_landmark_slots():
    extractor = FrameExtractor({"video": {"frame_height": 224, "frame_width": 224}})

    left_hand_only = SimpleNamespace(
        face_landmarks=None,
        left_hand_landmarks=SimpleNamespace(
            landmark=[SimpleNamespace(x=0.1, y=0.2, z=0.3) for _ in range(NUM_HAND_LANDMARKS)]
        ),
        right_hand_landmarks=None,
        pose_landmarks=None,
    )

    features = extractor._results_to_features(left_hand_only)

    face_end = NUM_FACE_LANDMARKS * 3
    left_hand_start = face_end
    left_hand_end = left_hand_start + (NUM_HAND_LANDMARKS * 3)

    assert np.all(features[:face_end] == 0)
    assert np.any(features[left_hand_start:left_hand_end])
    assert np.allclose(
        features[left_hand_start:left_hand_start + 3],
        [0.1, 0.2, 0.3],
    )


def test_lstm_model_defaults_to_mediapipe_feature_count():
    config = {
        "video": {
            "frame_height": 224,
            "frame_width": 224,
            "frames_per_sequence": 30,
            "fps": 30,
        },
        "model": {"sequence_length": 30},
        "dataset": {"num_classes": 50},
    }

    model = LSTMRecognizer(config).build_model()

    assert model.input_shape[1] == 30
    assert model.input_shape[2] == NUM_LANDMARK_FEATURES
