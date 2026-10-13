import tensorflow as tf
import numpy as np
import os
import json
from datetime import datetime
import matplotlib.pyplot as plt
from typing import Any, cast

callbacks = tf.keras.callbacks
optimizers = tf.keras.optimizers
losses = tf.keras.losses

class ModelTrainer:
    def __init__(self, config):
        self.config = config
        self.model_save_path = config['training']['model_save_path']
        os.makedirs(self.model_save_path, exist_ok=True)
        
    def train_model(self, model, X_train, y_train, X_val, y_val, model_name="model"):
        """Train the model with multi-metric tracking and checkpointing"""
        # Compile model with accuracy and top-k metrics
        model.compile(
            optimizer=optimizers.Adam(
                learning_rate=self.config['training'].get(
                    'learning_rate',
                    self.config['model'].get('learning_rate', 0.001),
                )
            ),
            loss=losses.CategoricalCrossentropy(),
            metrics=[
                'accuracy',
                tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy'),
                tf.keras.metrics.TopKCategoricalAccuracy(k=5, name='top_5_accuracy'),
            ]
        )
        
        # Callbacks
        best_ckpt_path = os.path.join(self.model_save_path, f'best_{model_name}.h5')
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
                filepath=best_ckpt_path,
                monitor='val_accuracy',
                save_best_only=True,
                mode='max'
            ),
            callbacks.TensorBoard(
                log_dir=os.path.join('logs', f"{model_name}_{datetime.now().strftime('%Y%m%d-%H%M%S')}")
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
    
    def plot_training_history(self, history, model_name="training"):
        """Plot training and validation metrics"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 4))
        fig = cast(Any, fig)
        
        # Accuracy
        ax1.plot(history.history['accuracy'], label='Train Accuracy', color='#2563eb', lw=2)
        if 'val_accuracy' in history.history:
            ax1.plot(history.history['val_accuracy'], label='Val Accuracy', color='#10b981', lw=2)
        ax1.set_title(f'{model_name.upper()} Model Accuracy', fontweight='bold')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Accuracy')
        ax1.grid(True, linestyle='--', alpha=0.5)
        ax1.legend()
        
        # Loss
        ax2.plot(history.history['loss'], label='Train Loss', color='#dc2626', lw=2)
        if 'val_loss' in history.history:
            ax2.plot(history.history['val_loss'], label='Val Loss', color='#f59e0b', lw=2)
        ax2.set_title(f'{model_name.upper()} Model Loss', fontweight='bold')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Loss')
        ax2.grid(True, linestyle='--', alpha=0.5)
        ax2.legend()
        
        plt.tight_layout()
        save_file = os.path.join(self.model_save_path, f'{model_name}_training_history.png')
        fig.savefig(save_file, dpi=300)  # type: ignore
        plt.close(fig)
        print(f"Training curves saved to {save_file}")
        
    def evaluate_model(self, model, X_test, y_test, labels=None, model_name="model"):
        """Evaluate model on test set using accuracy, precision, recall, F1, and top-k metrics"""
        from sklearn.metrics import classification_report, precision_score, recall_score, f1_score
        
        # Predict probabilities
        y_prob = model.predict(X_test, verbose=0)
        y_pred = np.argmax(y_prob, axis=1)
        y_true = np.argmax(y_test, axis=1) if y_test.ndim > 1 else y_test
        
        # Basic loss and accuracy
        eval_metrics = model.evaluate(X_test, y_test, verbose=0)
        test_loss = float(eval_metrics[0])
        test_accuracy = float(eval_metrics[1])
        
        # Advanced classification metrics
        precision_macro = float(precision_score(y_true, y_pred, average='macro', zero_division=0))
        precision_weighted = float(precision_score(y_true, y_pred, average='weighted', zero_division=0))
        recall_macro = float(recall_score(y_true, y_pred, average='macro', zero_division=0))
        recall_weighted = float(recall_score(y_true, y_pred, average='weighted', zero_division=0))
        f1_macro = float(f1_score(y_true, y_pred, average='macro', zero_division=0))
        f1_weighted = float(f1_score(y_true, y_pred, average='weighted', zero_division=0))
        
        # Top-k accuracy
        top_3_hits = sum([1 for i in range(len(y_true)) if y_true[i] in np.argsort(y_prob[i])[-3:]])
        top_3_acc = float(top_3_hits / len(y_true))
        top_5_hits = sum([1 for i in range(len(y_true)) if y_true[i] in np.argsort(y_prob[i])[-5:]])
        top_5_acc = float(top_5_hits / len(y_true))
        
        results = {
            'model_name': model_name,
            'test_loss': test_loss,
            'test_accuracy': test_accuracy,
            'precision_macro': precision_macro,
            'precision_weighted': precision_weighted,
            'recall_macro': recall_macro,
            'recall_weighted': recall_weighted,
            'f1_score_macro': f1_macro,
            'f1_score_weighted': f1_weighted,
            'top_3_accuracy': top_3_acc,
            'top_5_accuracy': top_5_acc,
            'total_test_samples': int(len(y_true)),
            'timestamp': datetime.now().isoformat()
        }
        
        # Save results
        out_path = os.path.join(self.model_save_path, f'{model_name}_evaluation_results.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
            
        # Also update global evaluation_results.json
        with open(os.path.join(self.model_save_path, 'evaluation_results.json'), 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
            
        # Confusion matrix plot
        try:
            from src.utils.visualization import plot_confusion_matrix
            cm_labels = labels if labels is not None else [f"Class_{i}" for i in range(y_prob.shape[1])]
            cm_path = os.path.join(self.model_save_path, f'{model_name}_confusion_matrix.png')
            plot_confusion_matrix(y_true, y_pred, cm_labels, top_k=25, save_path=cm_path)
        except Exception as e:
            print(f"Could not generate confusion matrix plot: {e}")
            
        print("=" * 60)
        print(f"EVALUATION SUMMARY: {model_name.upper()}")
        print("=" * 60)
        print(f"  • Test Loss:              {test_loss:.4f}")
        print(f"  • Test Accuracy:          {test_accuracy * 100:.2f}%")
        print(f"  • Precision (Macro):      {precision_macro * 100:.2f}%")
        print(f"  • Precision (Weighted):   {precision_weighted * 100:.2f}%")
        print(f"  • Recall (Macro):         {recall_macro * 100:.2f}%")
        print(f"  • Recall (Weighted):      {recall_weighted * 100:.2f}%")
        print(f"  • F1-Score (Macro):       {f1_macro * 100:.2f}%")
        print(f"  • F1-Score (Weighted):    {f1_weighted * 100:.2f}%")
        print(f"  • Top-3 Accuracy:         {top_3_acc * 100:.2f}%")
        print(f"  • Top-5 Accuracy:         {top_5_acc * 100:.2f}%")
        print("=" * 60)
        
        return results