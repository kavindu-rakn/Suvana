import cv2
import numpy as np
import os
import sys
from tqdm import tqdm
import json
from pathlib import Path

_SRC_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SRC_ROOT not in sys.path:
    sys.path.insert(0, _SRC_ROOT)

from data_preprocessing.frame_extractor import FrameExtractor, NUM_LANDMARK_FEATURES


class VideoProcessor:
    def __init__(self, config):
        self.config = config
        self.frame_height = config['video']['frame_height']
        self.frame_width = config['video']['frame_width']
        self.frames_per_sequence = config['video']['frames_per_sequence']
        self.fps = config['video']['fps']
        self.feature_extractor = FrameExtractor(config)

    def extract_keypoint_sequence(self, video_path):
        """Extract landmark keypoints from a video file."""
        cap = cv2.VideoCapture(str(video_path))
        keypoint_sequence = []
        last_keypoints = np.zeros(NUM_LANDMARK_FEATURES, dtype=np.float32)

        while len(keypoint_sequence) < self.frames_per_sequence:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (self.frame_width, self.frame_height))
            keypoints = self.feature_extractor.extract_keypoints(frame)
            if np.any(keypoints):
                last_keypoints = keypoints
            else:
                keypoints = last_keypoints
            keypoint_sequence.append(keypoints)

        cap.release()

        while len(keypoint_sequence) < self.frames_per_sequence:
            keypoint_sequence.append(last_keypoints.copy())

        if len(keypoint_sequence) > self.frames_per_sequence:
            indices = np.linspace(
                0,
                len(keypoint_sequence) - 1,
                self.frames_per_sequence,
                dtype=int,
            )
            keypoint_sequence = [keypoint_sequence[i] for i in indices]

        return np.array(keypoint_sequence[:self.frames_per_sequence], dtype=np.float32)

    def extract_frames(self, video_path, output_dir=None):
        """Backward-compatible alias that returns landmark keypoints."""
        return self.extract_keypoint_sequence(video_path)

    def process_dataset(self, dataset_path, output_path):
        """Process entire dataset into landmark sequences."""
        video_files = list(Path(dataset_path).glob('**/*.mp4'))
        video_files.extend(list(Path(dataset_path).glob('**/*.avi')))
        video_files.extend(list(Path(dataset_path).glob('**/*.mov')))

        processed_data = []
        labels = []

        os.makedirs(output_path, exist_ok=True)

        for video_path in tqdm(video_files, desc="Extracting landmarks"):
            label = self._extract_label(video_path)
            keypoints = self.extract_keypoint_sequence(str(video_path))
            processed_data.append(keypoints)
            labels.append(label)

        np.save(os.path.join(output_path, 'processed_data.npy'), np.array(processed_data, dtype=np.float32))
        np.save(os.path.join(output_path, 'labels.npy'), np.array(labels))

        return np.array(processed_data, dtype=np.float32), np.array(labels)

    def _extract_label(self, video_path):
        """Extract label from video file path."""
        return video_path.parent.name

    def create_annotations(self, data_path, output_path):
        """Create annotation file for the dataset."""
        annotations = {}
        video_files = list(Path(data_path).glob('**/*.mp4'))

        for i, video_path in enumerate(video_files):
            label = self._extract_label(video_path)
            annotations[str(video_path)] = {
                'id': i,
                'label': label,
                'frames': self.frames_per_sequence,
                'features_per_frame': NUM_LANDMARK_FEATURES,
            }

        os.makedirs(output_path, exist_ok=True)
        with open(os.path.join(output_path, 'annotations.json'), 'w') as f:
            json.dump(annotations, f, indent=2)

        return annotations
