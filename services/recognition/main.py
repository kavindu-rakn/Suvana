import os
import sys
import yaml
import argparse
from pathlib import Path
import time

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from data_preprocessing.fast_video_processor import FastVideoProcessor
from data_preprocessing.frame_extractor import FrameExtractor, DataAugmentation
from model.cnn_model import CNNModel, MobileNetModel
from model.lstm_model import LSTMRecognizer
from model.model_trainer import ModelTrainer
from recognition.real_time_recognizer import RealTimeRecognizer
from speech.text_to_speech import TextToSpeech

def load_config(config_path='config/config.yaml'):
    """Load configuration from YAML file"""
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    return config

def prepare_dataset_fast(config):
    """Prepare dataset using optimized processor"""
    print("Preparing dataset (optimized)...")
    
    # Initialize fast processor
    processor = FastVideoProcessor(config)
    
    # Process dataset with parallel processing
    data_path = config['dataset']['path']
    output_path = config['dataset']['processed_path']
    
    # Create output directory
    os.makedirs(output_path, exist_ok=True)
    
    start_time = time.time()
    
    # Process videos (choose one method)
    
    # Method 1: Parallel processing (faster for many files)
    X, y = processor.process_dataset_parallel(data_path, output_path)
    
    # Method 2: Batch processing (more memory efficient)
    # X, y = processor.batch_process_videos(data_path, output_path)
    
    elapsed_time = time.time() - start_time
    print(f"Dataset prepared in {elapsed_time/60:.2f} minutes")
    print(f"Processed {len(X)} samples")
    
    return X, y

def main():
    parser = argparse.ArgumentParser(description='Sinhala Sign Language Recognition System')
    parser.add_argument('--config', default='config/config.yaml', help='Path to config file')
    parser.add_argument('--mode', choices=['prepare', 'train', 'recognize', 'full'], 
                       default='full', help='Mode of operation')
    parser.add_argument('--model_path', help='Path to saved model for recognition')
    parser.add_argument('--workers', type=int, help='Number of parallel workers')
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Update model path if provided
    if args.model_path:
        config['model']['model_path'] = args.model_path
    
    # Execute based on mode
    if args.mode in ['prepare', 'full']:
        X, y = prepare_dataset_fast(config)
        
    if args.mode in ['train', 'full']:
        print("Training model...")
        # Add training code here
        from model.model_trainer import ModelTrainer
        from model.lstm_model import LSTMRecognizer
        import numpy as np
        
        # Load processed data
        data_path = config['dataset']['processed_path']
        X = np.load(os.path.join(data_path, 'processed_data.npy'))
        y = np.load(os.path.join(data_path, 'labels.npy'), allow_pickle=True)
        
        # Preprocess labels
        from sklearn.preprocessing import LabelEncoder
        from tensorflow.keras.utils import to_categorical

        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)
        y_categorical = to_categorical(y_encoded)

        # The model's output layer must match the actual number of gesture
        # classes found in the processed dataset, not a stale config value.
        config['dataset']['num_classes'] = len(label_encoder.classes_)
        print(f"Detected {len(label_encoder.classes_)} gesture classes")

        # Split data
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_categorical, test_size=0.2, random_state=42, stratify=y_encoded
        )
        X_train, X_val, y_train, y_val = train_test_split(
            X_train, y_train, test_size=0.2, random_state=42
        )
        
        # Build model
        model_builder = LSTMRecognizer(config)
        model = model_builder.build_model()
        
        # Train model
        trainer = ModelTrainer(config)
        trained_model, history = trainer.train_model(model, X_train, y_train, X_val, y_val)
        
        # Evaluate model
        results = trainer.evaluate_model(trained_model, X_test, y_test)
        
        # Plot training history
        trainer.plot_training_history(history)
        
        # Save model
        trainer.save_model(trained_model, 'lstm')
        
    if args.mode in ['recognize', 'full']:
        print("Starting real-time recognition...")
        recognizer = RealTimeRecognizer(config)
        try:
            recognizer.real_time_recognition_loop()
        except KeyboardInterrupt:
            print("\nStopping recognition...")
        finally:
            recognizer.stop()
        
    print("Operation completed successfully!")

if __name__ == "__main__":
    main()