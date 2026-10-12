import pytest
import numpy as np
import tensorflow as tf
from pathlib import Path

from model.lstm_model import LSTMRecognizer
from model.cnn_model import CNNModel, MobileNetModel
from model.transformer_model import SignTransformerRecognizer
from model.inference_engine import FastInferenceEngine

@pytest.fixture
def sample_config():
    return {
        "dataset": {"num_classes": 10},
        "model": {
            "type": "lstm",
            "input_shape": [224, 224, 3],
            "sequence_length": 30,
            "num_features": 1629,
            "lstm_units": 128,
            "dense_units": 256,
            "dropout_rate": 0.5,
            "learning_rate": 0.001,
            "model_path": "models/saved_models/best_model.h5"
        },
        "video": {
            "frame_height": 224,
            "frame_width": 224,
            "frames_per_sequence": 30,
            "fps": 30
        },
        "recognition": {
            "confidence_threshold": 0.7,
            "smoothing_window": 5
        }
    }

def test_lstm_model_architecture(sample_config):
    builder = LSTMRecognizer(sample_config)
    model = builder.build_model()
    assert model is not None
    assert model.input_shape == (None, 30, 1629)
    assert model.output_shape == (None, 10)

def test_bidirectional_lstm_model_architecture(sample_config):
    builder = LSTMRecognizer(sample_config)
    model = builder.build_bidirectional_lstm()
    assert model is not None
    assert model.input_shape == (None, 30, 1629)
    assert model.output_shape == (None, 10)

def test_cnn_model_architecture(sample_config):
    cnn_builder = CNNModel(sample_config)
    model = cnn_builder.build_model()
    assert model is not None
    assert model.input_shape == (None, 224, 224, 3)
    assert model.output_shape == (None, 10)

def test_transformer_model_architecture(sample_config):
    transformer_builder = SignTransformerRecognizer(sample_config)
    model = transformer_builder.build_model()
    assert model is not None
    assert model.input_shape == (None, 30, 1629)
    assert model.output_shape == (None, 10)

def test_fast_inference_engine_prediction():
    best_model_path = Path("models/saved_models/best_model.h5")
    if not best_model_path.exists():
        pytest.skip("best_model.h5 not found")
        
    engine = FastInferenceEngine(str(best_model_path))
    dummy_input = np.zeros((1, 30, 1629), dtype=np.float32)
    
    probs = engine.predict(dummy_input)
    assert isinstance(probs, np.ndarray)
    assert probs.ndim == 1
    assert len(probs) == 171
    assert np.isclose(np.sum(probs), 1.0, atol=1e-3)
    
    pred_class, conf = engine.predict_class(dummy_input, confidence_threshold=0.5)
    assert isinstance(conf, float)
    assert 0.0 <= conf <= 1.0
