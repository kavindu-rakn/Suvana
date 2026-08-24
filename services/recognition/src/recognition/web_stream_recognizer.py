from collections import deque, Counter

import numpy as np


class StreamRecognizer:
    """Per-connection sliding-window gesture recognizer for the web app.

    Mirrors RealTimeRecognizer's buffering/smoothing logic (real_time_recognizer.py)
    but holds its state per WebSocket connection instead of owning a camera loop,
    since frames arrive from the browser rather than a local cv2.VideoCapture.
    """

    def __init__(self, config, model, feature_extractor):
        self.config = config
        self.model = model
        self.feature_extractor = feature_extractor

        self.frame_width = config['video']['frame_width']
        self.frame_height = config['video']['frame_height']
        self.sequence_length = config['video']['frames_per_sequence']
        self.confidence_threshold = config['recognition']['confidence_threshold']
        self.smoothing_window = config['recognition']['smoothing_window']

        self.frame_buffer = deque(maxlen=self.sequence_length)
        self.prediction_buffer = deque(maxlen=self.smoothing_window)
        self.current_prediction = None

    def reset(self):
        self.frame_buffer.clear()
        self.prediction_buffer.clear()
        self.current_prediction = None

    def push_frame(self, frame_bgr):
        """Feed one BGR frame; returns (gesture_class_or_None, confidence, detection_results)."""
        import cv2

        # MediaPipe Holistic (face + pose + both hands) is by far the most
        # expensive step per frame. RealTimeRecognizer (the desktop app)
        # runs it twice -- once on a resized frame for model features, once
        # on the original for the on-screen overlay -- which is fine for a
        # local camera loop but doubles latency here, where it's the
        # critical path for how quickly landmarks respond to movement. One
        # call is enough: both the feature vector and the overlay landmarks
        # come from the same result.
        resized_frame = cv2.resize(frame_bgr, (self.frame_width, self.frame_height))
        rgb_frame = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2RGB)
        detection_results = self.feature_extractor.holistic.process(rgb_frame)
        features = self.feature_extractor._results_to_features(detection_results)

        self.frame_buffer.append(features)

        prediction, confidence = self._predict()
        if prediction is not None:
            self.prediction_buffer.append(prediction)
        elif len(self.prediction_buffer) < self.smoothing_window:
            self.prediction_buffer.append(None)

        gesture = None
        if len(self.prediction_buffer) == self.smoothing_window:
            valid_predictions = [p for p in self.prediction_buffer if p is not None]
            if valid_predictions:
                most_common, count = Counter(valid_predictions).most_common(1)[0]
                if count >= self.smoothing_window // 2:
                    self.current_prediction = most_common
                    gesture = most_common
                else:
                    self.current_prediction = None
            else:
                self.current_prediction = None

        buffer_progress = len(self.frame_buffer) / self.sequence_length
        return gesture, confidence, detection_results, buffer_progress

    def _predict(self):
        if len(self.frame_buffer) < self.sequence_length:
            return None, 0.0

        input_sequence = np.array(self.frame_buffer).reshape(1, self.sequence_length, -1)
        try:
            # Measured: calling the model directly (model(x)) runs this
            # LSTM eagerly and was ~5x slower in practice than model.predict(),
            # whose internal compiled tf.function is cached and reused across
            # calls here. Keep .predict() -- verified faster for this model.
            predictions = self.model.predict(input_sequence, verbose=0)
            predicted_class = int(np.argmax(predictions[0]))
            confidence = float(np.max(predictions[0]))
            if confidence >= self.confidence_threshold:
                return predicted_class, confidence
            return None, confidence
        except Exception as e:
            print(f"Prediction error: {e}")
            return None, 0.0
