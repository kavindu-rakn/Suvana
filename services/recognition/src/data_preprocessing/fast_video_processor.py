import cv2
import numpy as np
import os
import sys
from tqdm import tqdm
import json
from pathlib import Path
import multiprocessing as mp
import time

_SRC_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SRC_ROOT not in sys.path:
    sys.path.insert(0, _SRC_ROOT)

from data_preprocessing.frame_extractor import FrameExtractor, NUM_LANDMARK_FEATURES
from data_preprocessing.keypoint_augmentation import generate_augmented_sequences

DEFAULT_AUGMENTATIONS_PER_VIDEO = 11

def _filter_unnamed_videos(video_files):
    """Drop videos whose filename doesn't identify a gesture (e.g. a bare '.mp4')."""
    kept, skipped = [], []
    for video_path in video_files:
        stem = video_path.stem.strip()
        if not stem or stem == video_path.name:
            skipped.append(video_path)
        else:
            kept.append(video_path)
    return kept, skipped


def _validation_worker(task_queue, result_queue):
    """Long-lived child process: probes videos for readability as they arrive.

    Kept alive across videos (rather than one process per video) because on
    Windows, spawning a new process re-imports this whole program's entry
    point -- including the heavy TensorFlow/MediaPipe imports -- which costs
    several seconds per spawn. Paying that cost once here, instead of once
    per video, is the difference between this taking seconds vs. tens of
    minutes.
    """
    while True:
        path_str = task_queue.get()
        if path_str is None:
            return
        try:
            probe_cap = cv2.VideoCapture(path_str)
            ok = probe_cap.isOpened()
            if ok:
                ret, frame = probe_cap.read()
                ok = bool(ret) and frame is not None
            probe_cap.release()
        except Exception:
            ok = False
        result_queue.put(ok)


def _spawn_validation_worker():
    ctx = mp.get_context('spawn')
    task_queue = ctx.Queue()
    result_queue = ctx.Queue()
    worker = ctx.Process(target=_validation_worker, args=(task_queue, result_queue))
    worker.start()
    return worker, task_queue, result_queue


def _filter_unreadable_videos(video_files, timeout=5, warmup_timeout=30):
    """Drop videos that fail to open/read, e.g. corrupt or truncated recordings.

    Some corrupt/truncated video files cause cv2.VideoCapture to hang forever
    instead of failing, which would otherwise stall the whole dataset prep run,
    so each check is bounded by a timeout; a hang kills and replaces the worker.

    The *first* video handled by a freshly spawned worker pays a one-time cost
    (several seconds) to load cv2's video backend, unrelated to whether that
    video is valid -- so it gets a generous `warmup_timeout` instead of the
    tight `timeout` used for every video after the worker is warmed up.
    """
    import queue as queue_module

    valid, corrupt = [], []
    worker, task_queue, result_queue = _spawn_validation_worker()
    warmed_up = False

    for video_path in tqdm(video_files, desc="Validating videos"):
        task_queue.put(str(video_path))
        try:
            ok = result_queue.get(timeout=timeout if warmed_up else warmup_timeout)
            warmed_up = True
        except queue_module.Empty:
            ok = False
            worker.terminate()
            worker.join()
            worker, task_queue, result_queue = _spawn_validation_worker()
            warmed_up = False

        if ok:
            valid.append(video_path)
        else:
            corrupt.append(video_path)

    task_queue.put(None)
    worker.join(timeout=5)
    if worker.is_alive():
        worker.terminate()
        worker.join()

    return valid, corrupt


_worker_extractor = None


def _init_landmark_worker(config):
    """Create one MediaPipe extractor per worker process."""
    global _worker_extractor
    _worker_extractor = FrameExtractor(config)


def _process_video_with_landmarks(args):
    """Worker function that extracts landmark sequences from a single video."""
    video_path, label = args
    global _worker_extractor

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None, None

    frames_per_sequence = _worker_extractor.config['video']['frames_per_sequence']
    frame_width = _worker_extractor.config['video']['frame_width']
    frame_height = _worker_extractor.config['video']['frame_height']
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames == 0:
        cap.release()
        return None, None

    if total_frames >= frames_per_sequence:
        indices = np.linspace(0, total_frames - 1, frames_per_sequence, dtype=int)
    else:
        indices = list(range(total_frames)) + [total_frames - 1] * (frames_per_sequence - total_frames)
        indices = np.array(indices)

    keypoint_sequence = []
    last_keypoints = np.zeros(NUM_LANDMARK_FEATURES, dtype=np.float32)

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if ret:
            frame = cv2.resize(frame, (frame_width, frame_height))
            keypoints = _worker_extractor.extract_keypoints(frame)
            if np.any(keypoints):
                last_keypoints = keypoints
            else:
                keypoints = last_keypoints
            keypoint_sequence.append(keypoints)
        else:
            keypoint_sequence.append(last_keypoints.copy())

    cap.release()

    while len(keypoint_sequence) < frames_per_sequence:
        keypoint_sequence.append(last_keypoints.copy())

    return np.array(keypoint_sequence[:frames_per_sequence], dtype=np.float32), label


class FastVideoProcessor:
    def __init__(self, config):
        self.config = config
        self.frame_height = config['video']['frame_height']
        self.frame_width = config['video']['frame_width']
        self.frames_per_sequence = config['video']['frames_per_sequence']
        self.fps = config['video']['fps']
        self.feature_extractor = FrameExtractor(config)

    def extract_keypoint_sequence(self, video_path):
        """Extract a fixed-length sequence of landmark keypoints from a video."""
        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            print(f"Warning: Could not open video {video_path}")
            return None

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames == 0:
            cap.release()
            return None

        if total_frames >= self.frames_per_sequence:
            indices = np.linspace(0, total_frames - 1, self.frames_per_sequence, dtype=int)
        else:
            indices = list(range(total_frames)) + [total_frames - 1] * (self.frames_per_sequence - total_frames)
            indices = np.array(indices)

        keypoint_sequence = []
        last_keypoints = np.zeros(NUM_LANDMARK_FEATURES, dtype=np.float32)

        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ret, frame = cap.read()
            if ret:
                frame = cv2.resize(frame, (self.frame_width, self.frame_height))
                keypoints = self.feature_extractor.extract_keypoints(frame)
                if np.any(keypoints):
                    last_keypoints = keypoints
                else:
                    keypoints = last_keypoints
                keypoint_sequence.append(keypoints)
            else:
                keypoint_sequence.append(last_keypoints.copy())

        cap.release()

        while len(keypoint_sequence) < self.frames_per_sequence:
            keypoint_sequence.append(last_keypoints.copy())

        return np.array(keypoint_sequence[:self.frames_per_sequence], dtype=np.float32)

    def extract_frames_fast(self, video_path):
        """Backward-compatible alias that returns landmark keypoints."""
        return self.extract_keypoint_sequence(video_path)
    
    def process_single_video(self, video_path, output_dir, label):
        """Process a single video file and save its landmark sequence."""
        try:
            keypoints = self.extract_keypoint_sequence(video_path)
            if keypoints is not None:
                video_name = Path(video_path).stem
                output_file = os.path.join(output_dir, f"{video_name}.npy")
                np.save(output_file, keypoints)
                return output_file, label, keypoints
        except Exception as e:
            print(f"Error processing {video_path}: {e}")
        return None, None, None

    def _save_processed_dataset(self, sequences, labels, output_path):
        """Persist combined landmark sequences and labels for training."""
        if not sequences:
            return

        processed_data = np.array(sequences, dtype=np.float32)
        labels_array = np.array(labels)

        np.save(os.path.join(output_path, 'processed_data.npy'), processed_data)
        np.save(os.path.join(output_path, 'labels.npy'), labels_array)

    def process_dataset_parallel(self, dataset_path, output_path, num_workers=None):
        """Process dataset using parallel landmark extraction."""
        if num_workers is None:
            num_workers = max(1, mp.cpu_count() // 2)

        video_files = []
        for ext in ['*.mp4', '*.avi', '*.mov', '*.mkv']:
            video_files.extend(Path(dataset_path).glob(f'**/{ext}'))

        video_files, skipped = _filter_unnamed_videos(video_files)
        if skipped:
            print(f"Skipping {len(skipped)} video(s) with no usable gesture name (rename to identify): "
                  f"{[str(p) for p in skipped]}")

        video_files, corrupt = _filter_unreadable_videos(video_files)
        if corrupt:
            print(f"Skipping {len(corrupt)} unreadable/corrupt video(s): "
                  f"{[str(p) for p in corrupt]}")

        print(f"Found {len(video_files)} video files")
        print(f"Using {num_workers} workers for parallel landmark extraction")

        os.makedirs(output_path, exist_ok=True)

        augmentations_per_video = self.config['dataset'].get(
            'augmentations_per_video', DEFAULT_AUGMENTATIONS_PER_VIDEO
        )
        rng = np.random.default_rng(42)

        results = []
        labels = []
        sequences = []
        real_videos_processed = 0
        worker_args = [(str(video_path), video_path.stem) for video_path in video_files]

        if worker_args:
            with mp.Pool(
                processes=num_workers,
                initializer=_init_landmark_worker,
                initargs=(self.config,),
            ) as pool:
                for keypoints, label in tqdm(
                    pool.imap_unordered(_process_video_with_landmarks, worker_args),
                    total=len(worker_args),
                    desc="Extracting landmarks",
                ):
                    if keypoints is not None and label is not None:
                        sequences.append(keypoints)
                        labels.append(label)
                        results.append(label)
                        real_videos_processed += 1

                        if augmentations_per_video > 0:
                            for variant in generate_augmented_sequences(
                                keypoints, augmentations_per_video, rng
                            ):
                                sequences.append(variant)
                                labels.append(label)

        metadata = {
            'num_samples': len(sequences),
            'real_videos_processed': real_videos_processed,
            'augmentations_per_video': augmentations_per_video,
            'labels': sorted(set(labels)),
            'feature_shape': [self.frames_per_sequence, NUM_LANDMARK_FEATURES],
            'processed_files': len(sequences),
        }

        with open(os.path.join(output_path, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)

        self._save_processed_dataset(sequences, labels, output_path)

        print(f"Successfully processed {len(sequences)} videos into landmark sequences")
        return np.array(sequences, dtype=np.float32), labels
    
    def batch_process_videos(self, dataset_path, output_path, batch_size=32):
        """Process videos in batches and save landmark sequences."""
        video_files = []
        for ext in ['*.mp4', '*.avi', '*.mov', '*.mkv']:
            video_files.extend(Path(dataset_path).glob(f'**/{ext}'))

        video_files, skipped = _filter_unnamed_videos(video_files)
        if skipped:
            print(f"Skipping {len(skipped)} video(s) with no usable gesture name (rename to identify): "
                  f"{[str(p) for p in skipped]}")

        video_files, corrupt = _filter_unreadable_videos(video_files)
        if corrupt:
            print(f"Skipping {len(corrupt)} unreadable/corrupt video(s): "
                  f"{[str(p) for p in corrupt]}")

        print(f"Processing {len(video_files)} videos in batches of {batch_size}")

        augmentations_per_video = self.config['dataset'].get(
            'augmentations_per_video', DEFAULT_AUGMENTATIONS_PER_VIDEO
        )
        rng = np.random.default_rng(42)

        os.makedirs(output_path, exist_ok=True)

        all_sequences = []
        all_labels = []

        for i in tqdm(range(0, len(video_files), batch_size), desc="Processing batches"):
            batch = video_files[i:i + batch_size]
            batch_sequences = []
            batch_labels = []

            for video_path in batch:
                label = video_path.stem
                keypoints = self.extract_keypoint_sequence(video_path)
                if keypoints is not None:
                    batch_sequences.append(keypoints)
                    batch_labels.append(label)
                    if augmentations_per_video > 0:
                        for variant in generate_augmented_sequences(
                            keypoints, augmentations_per_video, rng
                        ):
                            batch_sequences.append(variant)
                            batch_labels.append(label)

            if batch_sequences:
                batch_array = np.array(batch_sequences, dtype=np.float32)
                batch_labels_array = np.array(batch_labels)

                batch_start = i
                np.save(
                    os.path.join(output_path, f'batch_{batch_start:04d}_frames.npy'),
                    batch_array,
                )
                np.save(
                    os.path.join(output_path, f'batch_{batch_start:04d}_labels.npy'),
                    batch_labels_array,
                )

                all_sequences.extend(batch_sequences)
                all_labels.extend(batch_labels)

        self._save_processed_dataset(all_sequences, all_labels, output_path)

        return all_sequences, all_labels