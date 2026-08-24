import cv2
import numpy as np
from scipy import ndimage
import mediapipe as mp

class GestureProcessor:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
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
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    self.mp_drawing_styles.get_default_hand_connections_style()
                )
        return frame
    
    def segment_hands(self, frame, results):
        """Segment hands from background"""
        if not results.multi_hand_landmarks:
            return frame
            
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        
        for hand_landmarks in results.multi_hand_landmarks:
            # Get bounding box of hand
            x_coords = [landmark.x for landmark in hand_landmarks.landmark]
            y_coords = [landmark.y for landmark in hand_landmarks.landmark]
            
            h, w = frame.shape[:2]
            x_min = int(min(x_coords) * w) - 20
            x_max = int(max(x_coords) * w) + 20
            y_min = int(min(y_coords) * h) - 20
            y_max = int(max(y_coords) * h) + 20
            
            # Create mask
            cv2.rectangle(mask, (x_min, y_min), (x_max, y_max), 255, -1)
            
        # Apply mask to frame
        segmented = cv2.bitwise_and(frame, frame, mask=mask)
        return segmented
    
    def compute_optical_flow(self, prev_frame, curr_frame):
        """Compute optical flow between two frames"""
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)
        
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
        )
        
        return flow
    
    def extract_motion_features(self, prev_frame, curr_frame):
        """Extract motion features from video frames"""
        flow = self.compute_optical_flow(prev_frame, curr_frame)
        
        # Compute magnitude and angle
        magnitude, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        
        # Compute histogram of optical flow
        hist = cv2.calcHist([magnitude.astype(np.float32)], [0], None, [16], [0, 10])
        hist = hist / hist.sum()
        
        return hist.flatten()