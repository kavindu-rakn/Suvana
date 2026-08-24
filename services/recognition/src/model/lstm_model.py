import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np

class LSTMRecognizer:
    def __init__(self, config):
        self.config = config
        self.sequence_length = config['model']['sequence_length']
        self.num_features = config['model'].get('num_features', 1629)
        self.num_classes = config['dataset']['num_classes']
        
    def build_model(self):
        """Build LSTM model for sequence recognition"""
        model = models.Sequential([
            # Input layer for sequence data
            layers.Input(shape=(self.sequence_length, self.num_features)),
            
            # First LSTM layer
            layers.LSTM(256, return_sequences=True, 
                       activation='tanh', 
                       recurrent_dropout=0.3,
                       dropout=0.3),
            layers.BatchNormalization(),
            
            # Second LSTM layer
            layers.LSTM(128, return_sequences=True,
                       activation='tanh',
                       recurrent_dropout=0.3,
                       dropout=0.3),
            layers.BatchNormalization(),
            
            # Third LSTM layer
            layers.LSTM(64, activation='tanh',
                       recurrent_dropout=0.3,
                       dropout=0.3),
            layers.BatchNormalization(),
            
            # Dense layers
            layers.Dense(256, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            
            layers.Dense(128, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        return model
    
    def build_bidirectional_lstm(self):
        """Build Bidirectional LSTM model"""
        model = models.Sequential([
            layers.Input(shape=(self.sequence_length, self.num_features)),
            
            # Bidirectional LSTM layers
            layers.Bidirectional(layers.LSTM(256, return_sequences=True,
                                            recurrent_dropout=0.3,
                                            dropout=0.3)),
            layers.BatchNormalization(),
            
            layers.Bidirectional(layers.LSTM(128, return_sequences=True,
                                            recurrent_dropout=0.3,
                                            dropout=0.3)),
            layers.BatchNormalization(),
            
            layers.Bidirectional(layers.LSTM(64, recurrent_dropout=0.3,
                                            dropout=0.3)),
            layers.BatchNormalization(),
            
            # Dense layers
            layers.Dense(256, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            
            layers.Dense(128, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        return model