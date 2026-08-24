import cv2
import numpy as np
import mediapipe as mp
import os
from tqdm import tqdm
import random

NUM_POSE_LANDMARKS = 33
NUM_FACE_LANDMARKS = 468
NUM_HAND_LANDMARKS = 21
NUM_LANDMARK_FEATURES = (
    NUM_POSE_LANDMARKS + NUM_FACE_LANDMARKS + (2 * NUM_HAND_LANDMARKS)
) * 3  # 1629


class FrameExtractor:
    def __init__(self, config):
        self.config = config
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing_styles = mp.solutions.drawing_styles

    @staticmethod
    def _landmarks_to_array(landmark_list, count):
        """Convert a landmark list to a fixed-size flat array."""
        if landmark_list:
            coords = []
            for landmark in landmark_list.landmark:
                coords.extend([landmark.x, landmark.y, landmark.z])
            return coords
        return [0.0] * (count * 3)

    def _results_to_features(self, results):
        """Build a fixed-length feature vector from holistic results."""
        if not results:
            return np.zeros(NUM_LANDMARK_FEATURES, dtype=np.float32)

        landmarks = []
        landmarks.extend(self._landmarks_to_array(results.face_landmarks, NUM_FACE_LANDMARKS))
        landmarks.extend(self._landmarks_to_array(results.left_hand_landmarks, NUM_HAND_LANDMARKS))
        landmarks.extend(self._landmarks_to_array(results.right_hand_landmarks, NUM_HAND_LANDMARKS))
        landmarks.extend(self._landmarks_to_array(results.pose_landmarks, NUM_POSE_LANDMARKS))
        return np.array(landmarks[:NUM_LANDMARK_FEATURES], dtype=np.float32)

    def detect_landmarks(self, frame):
        """Run MediaPipe Holistic on a BGR frame and return the results."""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            return self.holistic.process(rgb_frame)
        except Exception as e:
            print(f"Error detecting landmarks: {e}")
            return None

    def draw_landmarks(self, frame, results):
        """Draw MediaPipe landmarks onto a BGR frame."""
        if not results:
            return frame

        if results.face_landmarks:
            self.mp_drawing.draw_landmarks(
                frame,
                results.face_landmarks,
                self.mp_holistic.FACEMESH_TESSELATION,
                landmark_drawing_spec=None,
                connection_drawing_spec=self.mp_drawing_styles.get_default_face_mesh_tesselation_style(),
            )
            self.mp_drawing.draw_landmarks(
                frame,
                results.face_landmarks,
                self.mp_holistic.FACEMESH_CONTOURS,
                landmark_drawing_spec=None,
                connection_drawing_spec=self.mp_drawing_styles.get_default_face_mesh_contours_style(),
            )

        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                self.mp_holistic.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style(),
            )

        if results.left_hand_landmarks:
            self.mp_drawing.draw_landmarks(
                frame,
                results.left_hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS,
                self.mp_drawing_styles.get_default_hand_landmarks_style(),
                self.mp_drawing_styles.get_default_hand_connections_style(),
            )

        if results.right_hand_landmarks:
            self.mp_drawing.draw_landmarks(
                frame,
                results.right_hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS,
                self.mp_drawing_styles.get_default_hand_landmarks_style(),
                self.mp_drawing_styles.get_default_hand_connections_style(),
            )

        return frame
        
    def extract_landmarks(self, frame):
        """Extract pose, face, and hand landmarks into a fixed-size vector."""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.holistic.process(rgb_frame)
            return self._results_to_features(results)
        except Exception as e:
            print(f"Error extracting landmarks: {e}")
            return np.zeros(NUM_LANDMARK_FEATURES, dtype=np.float32)

    def extract_keypoints(self, frame):
        """Extract keypoints using MediaPipe Holistic."""
        return self.extract_landmarks(frame)
    
    def detect_hands(self, frame):
        """Detect hands in the frame"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)
        return results
    
    def extract_hand_features(self, results):
        """Extract features from hand landmarks"""
        if not results.multi_hand_landmarks:
            return None
            
        features = []
        for hand_landmarks in results.multi_hand_landmarks:
            # Get landmark coordinates
            landmarks = []
            for landmark in hand_landmarks.landmark:
                landmarks.extend([landmark.x, landmark.y, landmark.z])
            features.extend(landmarks)
            
        return np.array(features)
    
    def draw_hand_landmarks(self, frame, results):
        """Draw hand landmarks on frame"""
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                    self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
                )
        return frame

class DataAugmentation:
    def __init__(self):
        self.augmentation_methods = [
            self.flip_horizontal,
            self.random_rotation,
            self.random_brightness,
            self.add_noise
        ]
        
    def flip_horizontal(self, frames):
        """Flip frames horizontally"""
        return np.flip(frames, axis=2)
    
    def random_rotation(self, frames, max_angle=15):
        """Randomly rotate frames"""
        angle = np.random.uniform(-max_angle, max_angle)
        rotated_frames = []
        for frame in frames:
            rows, cols = frame.shape[:2]
            M = cv2.getRotationMatrix2D((cols/2, rows/2), angle, 1)
            rotated = cv2.warpAffine(frame, M, (cols, rows))
            rotated_frames.append(rotated)
        return np.array(rotated_frames)
    
    def random_brightness(self, frames, max_delta=0.2):
        """Randomly adjust brightness"""
        delta = np.random.uniform(-max_delta, max_delta)
        return np.clip(frames + delta, 0, 1)
    
    def add_noise(self, frames, noise_level=0.05):
        """Add random noise to frames"""
        noise = np.random.normal(0, noise_level, frames.shape)
        return np.clip(frames + noise, 0, 1)
    
    def augment_data(self, frames, label):
        """Apply random augmentations to the data"""
        augmented_frames = [frames]
        augmented_labels = [label]
        
        num_augmentations = random.randint(2, 4)
        methods = random.sample(self.augmentation_methods, num_augmentations)
        
        for method in methods:
            if method.__name__ == 'flip_horizontal':
                # Don't flip if it would change the meaning
                if label in ['left', 'right', 'direction']:
                    continue
            augmented_frames.append(method(frames.copy()))
            augmented_labels.append(label)
            
        return augmented_frames, augmented_labels