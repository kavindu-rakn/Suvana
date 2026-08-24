import cv2
import numpy as np
import tensorflow as tf
from collections import deque
import threading
import queue
import time
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class RealTimeRecognizer:
    def __init__(self, config):
        self.config = config
        self.frame_width = config['video']['frame_width']
        self.frame_height = config['video']['frame_height']
        self.sequence_length = config['video']['frames_per_sequence']
        self.confidence_threshold = config['recognition']['confidence_threshold']
        self.smoothing_window = config['recognition']['smoothing_window']
        
        # Initialize buffers
        self.frame_buffer = deque(maxlen=self.sequence_length)
        self.prediction_buffer = deque(maxlen=self.smoothing_window)
        self.current_prediction = None
        
        # Load model
        self.model = self.load_model()
        
        # Initialize feature extractor
        from data_preprocessing.frame_extractor import FrameExtractor
        self.feature_extractor = FrameExtractor(config)
        
        # Speech module
        from speech.text_to_speech import TextToSpeech
        self.tts = TextToSpeech(config)
        
        # Threading
        self.is_running = False
        self.frame_queue = queue.Queue(maxsize=10)
        self.prediction_queue = queue.Queue(maxsize=10)
        
        # Label mapping
        self.label_map = self._create_label_map()
        
    def _create_label_map(self):
        """Create label mapping from dataset"""
        labels = {}
        try:
            # Try to load from saved labels
            labels_path = os.path.join(self.config['dataset']['processed_path'], 'labels.npy')
            if os.path.exists(labels_path):
                unique_labels = np.unique(np.load(labels_path, allow_pickle=True))
                labels = {i: str(label) for i, label in enumerate(unique_labels)}
            else:
                # Fallback labels
                labels = {
                    0: "Hello",
                    1: "Thank you",
                    2: "Yes",
                    3: "No",
                    4: "Help",
                    5: "Water",
                    6: "Food",
                    7: "School",
                    8: "Teacher",
                    9: "Student",
                    10: "Good morning",
                    11: "Good night",
                    12: "How are you?",
                    13: "I am fine",
                    14: "Please",
                    15: "Sorry",
                    16: "Friend",
                    17: "Family",
                    18: "Love",
                    19: "Happy"
                }
        except Exception as e:
            print(f"Could not load label map: {e}")
            labels = {i: f"Gesture_{i}" for i in range(50)}
        
        return labels
    
    def load_model(self):
        """Load trained model"""
        model_path = self.config['model'].get('model_path', 'models/saved_models/best_model.h5')
        if os.path.exists(model_path):
            print(f"Loading model from {model_path}")
            return tf.keras.models.load_model(model_path)
        else:
            print(f"Model not found at {model_path}")
            print("Creating a new model...")
            # Create a dummy model for testing
            from model.lstm_model import LSTMRecognizer
            model_builder = LSTMRecognizer(self.config)
            model = model_builder.build_model()
            # Save dummy model
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            model.save(model_path)
            print(f"Created and saved dummy model at {model_path}")
            return model
    
    def process_frame(self, frame):
        """Process a single frame and return features plus landmark detection results."""
        resized_frame = cv2.resize(frame, (self.frame_width, self.frame_height))

        # Extract landmark features from the resized frame used by the model
        features = self.feature_extractor.extract_keypoints(resized_frame)

        # Run detection on the display frame so overlays align with the camera view
        detection_results = self.feature_extractor.detect_landmarks(frame)

        return features, detection_results
    
    def predict_gesture(self, features):
        """Predict gesture from features"""
        if len(self.frame_buffer) < self.sequence_length:
            return None, 0.0
        
        # Prepare input for model
        input_sequence = np.array(self.frame_buffer).reshape(1, self.sequence_length, -1)
        
        # Make prediction. Measured on the web app's identical model/config:
        # calling the model directly (model(x)) runs eagerly and was ~5x
        # slower than model.predict(), whose compiled tf.function is cached
        # and reused across calls -- keep .predict() here too.
        try:
            predictions = self.model.predict(input_sequence, verbose=0)
            predicted_class = np.argmax(predictions[0])
            confidence = np.max(predictions[0])
            
            if confidence >= self.confidence_threshold:
                return predicted_class, confidence
            else:
                return None, confidence
        except Exception as e:
            print(f"Prediction error: {e}")
            return None, 0.0
    
    def recognize_gesture(self, frame):
        """Main recognition pipeline for a single frame"""
        features, detection_results = self.process_frame(frame)
        self.frame_buffer.append(features)
        
        # Update prediction buffer
        prediction, confidence = self.predict_gesture(features)
        if prediction is not None:
            self.prediction_buffer.append(prediction)
        else:
            # Append None to maintain buffer size
            if len(self.prediction_buffer) < self.smoothing_window:
                self.prediction_buffer.append(None)
        
        # Smooth predictions
        if len(self.prediction_buffer) == self.smoothing_window:
            # Get most common prediction (ignoring None)
            valid_predictions = [p for p in self.prediction_buffer if p is not None]
            if valid_predictions:
                from collections import Counter
                most_common = Counter(valid_predictions).most_common(1)[0]
                if most_common[1] >= self.smoothing_window // 2:
                    self.current_prediction = most_common[0]
                    return self.current_prediction, confidence, detection_results
                else:
                    self.current_prediction = None
                    return None, 0.0, detection_results
            else:
                self.current_prediction = None
                return None, 0.0, detection_results
        
        return self.current_prediction, confidence if prediction is not None else 0.0, detection_results
    
    def real_time_recognition_loop(self):
        """Main loop for real-time recognition"""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("Error: Could not open camera!")
            return
            
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        self.is_running = True
        prediction_display = None
        confidence_display = 0.0
        
        print("\n" + "="*50)
        print("REAL-TIME SIGN LANGUAGE RECOGNITION")
        print("="*50)
        print("Controls:")
        print("  'q' - Quit application")
        print("  's' - Speak recognized gesture")
        print("  'r' - Reset recognition")
        print("="*50 + "\n")
        
        while self.is_running:
            ret, frame = cap.read()
            if not ret:
                print("Failed to capture frame")
                break
                
            # Mirror frame for natural interaction
            frame = cv2.flip(frame, 1)
            
            # Process frame
            start_time = time.time()
            prediction, confidence, detection_results = self.recognize_gesture(frame)
            processing_time = time.time() - start_time
            
            # Display results
            display_frame = frame.copy()
            if detection_results is not None:
                display_frame = self.feature_extractor.draw_landmarks(display_frame, detection_results)
            
            if prediction is not None:
                prediction_display = prediction
                confidence_display = confidence
                self.display_prediction(display_frame, prediction, confidence, processing_time)
            else:
                self.display_processing(display_frame, processing_time)
            
            # Show FPS
            if self.config['recognition']['display_fps']:
                self.display_fps(display_frame, processing_time)
            
            # Display instructions
            self.display_instructions(display_frame)
            
            # Display frame
            cv2.imshow('Sinhala Sign Language Recognition', display_frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s') and prediction_display is not None:
                # Speak the recognized gesture
                label = self.get_gesture_label(prediction_display)
                if label:
                    print(f"🔊 Speaking: {label}")
                    self.tts.speak(label)
            elif key == ord('r'):
                # Reset recognition
                self.frame_buffer.clear()
                self.prediction_buffer.clear()
                self.current_prediction = None
                print("🔄 Recognition reset")
            
        cap.release()
        cv2.destroyAllWindows()
        self.is_running = False
        print("\nRecognition stopped.")
    
    def display_prediction(self, frame, prediction, confidence, processing_time):
        """Display prediction on frame"""
        # Get gesture label
        label = self.get_gesture_label(prediction)
        
        # Create semi-transparent background
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (550, 120), (0, 255, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Display prediction
        cv2.putText(frame, f"Gesture: {label}", 
                   (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                   1.0, (0, 0, 0), 2)
        
        # Display confidence
        confidence_percent = confidence * 100
        cv2.putText(frame, f"Confidence: {confidence_percent:.1f}%", 
                   (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 
                   0.7, (0, 0, 0), 2)
        
        # Show processing time
        cv2.putText(frame, f"Processing: {processing_time*1000:.0f}ms", 
                   (20, 105), cv2.FONT_HERSHEY_SIMPLEX, 
                   0.5, (0, 0, 0), 1)
    
    def display_processing(self, frame, processing_time):
        """Display processing status"""
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (400, 70), (0, 0, 255), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        cv2.putText(frame, "Processing...", 
                   (20, 45), cv2.FONT_HERSHEY_SIMPLEX, 
                   1.0, (255, 255, 255), 2)
        
        # Show processing time
        cv2.putText(frame, f"Processing: {processing_time*1000:.0f}ms", 
                   (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 
                   0.5, (255, 255, 255), 1)
    
    def display_fps(self, frame, processing_time):
        """Display FPS"""
        fps = 1.0 / processing_time if processing_time > 0 else 0
        cv2.putText(frame, f"FPS: {fps:.1f}", 
                   (frame.shape[1] - 150, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 
                   0.6, (0, 255, 0), 2)
    
    def display_instructions(self, frame):
        """Display keyboard instructions"""
        instructions = [
            "q: Quit",
            "s: Speak",
            "r: Reset"
        ]
        
        y_pos = frame.shape[0] - 30
        x_pos = 10
        for instruction in instructions:
            cv2.putText(frame, instruction, 
                       (x_pos, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 
                       0.5, (255, 255, 255), 1)
            x_pos += 120
    
    def get_gesture_label(self, prediction):
        """Get label for prediction index"""
        return self.label_map.get(prediction, f"Gesture_{prediction}")
    
    def stop(self):
        """Stop the recognition loop"""
        self.is_running = False
        if hasattr(self, 'tts'):
            self.tts.shutdown()