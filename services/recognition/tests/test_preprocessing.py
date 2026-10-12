import pytest
import numpy as np
import cv2

from data_preprocessing.frame_extractor import (
    FrameExtractor,
    DataAugmentation,
    NUM_LANDMARK_FEATURES,
    NUM_POSE_LANDMARKS,
    NUM_FACE_LANDMARKS,
    NUM_HAND_LANDMARKS,
)

@pytest.fixture
def dummy_config():
    return {
        "video": {
            "frame_height": 224,
            "frame_width": 224,
            "frames_per_sequence": 30,
            "fps": 30,
        }
    }

def test_feature_vector_dimension_constants():
    expected = (NUM_POSE_LANDMARKS + NUM_FACE_LANDMARKS + (2 * NUM_HAND_LANDMARKS)) * 3
    assert NUM_LANDMARK_FEATURES == expected
    assert NUM_LANDMARK_FEATURES == 1629

def test_landmarks_to_array_zero_padding():
    arr = FrameExtractor._landmarks_to_array(None, 21)
    assert len(arr) == 63
    assert all(v == 0.0 for v in arr)

def test_results_to_features_empty_returns_zeros(dummy_config):
    extractor = FrameExtractor(dummy_config)
    features = extractor._results_to_features(None)
    assert isinstance(features, np.ndarray)
    assert features.shape == (1629,)
    assert np.all(features == 0.0)

def test_data_augmentation_flip():
    aug = DataAugmentation()
    frames = np.ones((5, 10, 10, 3), dtype=np.float32)
    frames[:, :, 0, :] = 5.0
    flipped = aug.flip_horizontal(frames)
    assert flipped.shape == frames.shape
    assert np.all(flipped[:, :, -1, :] == 5.0)

def test_data_augmentation_brightness():
    aug = DataAugmentation()
    frames = np.zeros((5, 10, 10, 3), dtype=np.float32)
    bright = aug.random_brightness(frames, max_delta=0.2)
    assert bright.shape == frames.shape
    assert np.all(bright >= 0.0) and np.all(bright <= 1.0)
