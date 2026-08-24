import tensorflow as tf
from tensorflow.keras import callbacks, optimizers, losses
import numpy as np
import os
import json
from datetime import datetime
import matplotlib.pyplot as plt

class ModelTrainer:
    def __init__(self, config):
        self.config = config
        self.model_save_path = config['training']['model_save_path']
        os.makedirs(self.model_save_path, exist_ok=True)
        
    def train_model(self, model, X_train, y_train, X_val, y_val):
        """Train the model"""
        # Compile model
        model.compile(
            optimizer=optimizers.Adam(
                learning_rate=self.config['training'].get(
                    'learning_rate',
                    self.config['model']['learning_rate'],
                )
            ),
            loss=losses.CategoricalCrossentropy(),
            metrics=['accuracy']
        )
        
        # Callbacks
        callbacks_list = [
            callbacks.EarlyStopping(
                monitor='val_loss',
                patience=self.config['training']['early_stopping_patience'],
                restore_best_weights=True
            ),
            callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7
            ),
            callbacks.ModelCheckpoint(
                filepath=os.path.join(self.model_save_path, 'best_model.h5'),
                monitor='val_accuracy',
                save_best_only=True,
                mode='max'
            ),
            callbacks.TensorBoard(
                log_dir=os.path.join('logs', datetime.now().strftime("%Y%m%d-%H%M%S"))
            )
        ]
        
        # Train model
        history = model.fit(
            X_train, y_train,
            batch_size=self.config['training']['batch_size'],
            epochs=self.config['training']['epochs'],
            validation_data=(X_val, y_val),
            callbacks=callbacks_list,
            verbose=1
        )
        
        return model, history
    
    def save_model(self, model, model_name):
        """Save the trained model"""
        model_path = os.path.join(self.model_save_path, f'{model_name}_model.h5')
        model.save(model_path)
        print(f"Model saved to {model_path}")
        
        return model_path
    
    def plot_training_history(self, history):
        """Plot training and validation metrics"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        
        # Accuracy
        ax1.plot(history.history['accuracy'], label='Training Accuracy')
        ax1.plot(history.history['val_accuracy'], label='Validation Accuracy')
        ax1.set_title('Model Accuracy')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Accuracy')
        ax1.legend()
        
        # Loss
        ax2.plot(history.history['loss'], label='Training Loss')
        ax2.plot(history.history['val_loss'], label='Validation Loss')
        ax2.set_title('Model Loss')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Loss')
        ax2.legend()
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.model_save_path, 'training_history.png'))
        plt.close(fig)
        
    def evaluate_model(self, model, X_test, y_test):
        """Evaluate model on test set"""
        test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=1)
        
        results = {
            'test_loss': float(test_loss),
            'test_accuracy': float(test_accuracy),
            'timestamp': datetime.now().isoformat()
        }
        
        # Save results
        with open(os.path.join(self.model_save_path, 'evaluation_results.json'), 'w') as f:
            json.dump(results, f, indent=2)
            
        print(f"Test Accuracy: {test_accuracy:.4f}")
        print(f"Test Loss: {test_loss:.4f}")
        
        return results