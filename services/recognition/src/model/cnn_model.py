import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
import numpy as np

class CNNModel:
    def __init__(self, config):
        self.config = config
        self.input_shape = config['model']['input_shape']
        self.num_classes = config['dataset']['num_classes']
        
    def build_model(self):
        """Build CNN model for frame-level feature extraction"""
        model = models.Sequential([
            # Input layer
            layers.Input(shape=self.input_shape),
            
            # First convolutional block
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Second convolutional block
            layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Third convolutional block
            layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.3),
            
            # Fourth convolutional block
            layers.Conv2D(512, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.3),
            
            # Global average pooling and dense layers
            layers.GlobalAveragePooling2D(),
            layers.Dense(512, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            layers.Dense(256, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        return model

class MobileNetModel:
    def __init__(self, config):
        self.config = config
        self.input_shape = config['model']['input_shape']
        self.num_classes = config['dataset']['num_classes']
        
    def build_model(self, include_top=False):
        """Build MobileNetV2 model for feature extraction"""
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=self.input_shape,
            include_top=include_top,
            weights='imagenet'
        )
        base_model.trainable = False
        
        x = base_model.output
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dense(512, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.5)(x)
        x = layers.Dense(256, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.5)(x)
        predictions = layers.Dense(self.num_classes, activation='softmax')(x)
        
        model = models.Model(inputs=base_model.input, outputs=predictions)
        return model