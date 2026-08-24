import numpy as np


def _linear_resample(sequence, out_len):
    """Resample a (frames, features) sequence to out_len frames via linear interpolation."""
    n = sequence.shape[0]
    if n == out_len:
        return sequence.copy()
    src_positions = np.linspace(0, n - 1, out_len)
    floor_idx = np.floor(src_positions).astype(int)
    ceil_idx = np.minimum(floor_idx + 1, n - 1)
    frac = (src_positions - floor_idx)[:, None]
    return (sequence[floor_idx] * (1 - frac) + sequence[ceil_idx] * frac).astype(np.float32)


def _jitter(sequence, rng, sigma=0.01):
    """Add small Gaussian noise to detected (non-padding) landmark coordinates."""
    mask = sequence != 0.0
    noise = rng.normal(0.0, sigma, size=sequence.shape).astype(np.float32)
    return np.where(mask, sequence + noise, sequence).astype(np.float32)


def _translate(sequence, rng, max_shift=0.03):
    """Shift detected landmarks by a small constant offset (simulates framing/position)."""
    dx, dy = rng.uniform(-max_shift, max_shift, size=2)
    out = sequence.copy()
    x_mask = out[:, 0::3] != 0.0
    y_mask = out[:, 1::3] != 0.0
    out[:, 0::3] = np.where(x_mask, out[:, 0::3] + dx, out[:, 0::3])
    out[:, 1::3] = np.where(y_mask, out[:, 1::3] + dy, out[:, 1::3])
    return out.astype(np.float32)


def _scale(sequence, rng, max_delta=0.05):
    """Scale detected landmarks around the frame center (simulates distance from camera)."""
    factor = 1.0 + rng.uniform(-max_delta, max_delta)
    out = sequence.copy()
    for axis in (0, 1):
        mask = out[:, axis::3] != 0.0
        centered = (out[:, axis::3] - 0.5) * factor + 0.5
        out[:, axis::3] = np.where(mask, centered, out[:, axis::3])
    return out.astype(np.float32)


def _time_warp(sequence, rng, max_ratio=0.15):
    """Stretch or compress the sequence in time (simulates signing faster/slower)."""
    n = sequence.shape[0]
    ratio = 1.0 + rng.uniform(-max_ratio, max_ratio)
    src_len = max(2, int(round(n * ratio)))
    warped = _linear_resample(sequence, src_len)
    return _linear_resample(warped, n)


def _frame_hold(sequence, rng, max_holds=2):
    """Duplicate a preceding frame at a random position (simulates a brief pause)."""
    out = sequence.copy()
    n = out.shape[0]
    if n < 2:
        return out
    for _ in range(int(rng.integers(1, max_holds + 1))):
        i = int(rng.integers(1, n))
        out[i] = out[i - 1]
    return out


_METHODS = [_jitter, _translate, _scale, _time_warp, _frame_hold]


def generate_augmented_sequences(sequence, count, rng=None):
    """Generate `count` augmented variants of a (frames, features) keypoint sequence.

    Each variant applies 2-4 randomly chosen, composable augmentations. Horizontal
    mirroring is deliberately excluded: sign language gestures are handedness-specific,
    so a mirrored sequence can represent a different (or nonsensical) sign.
    """
    if rng is None:
        rng = np.random.default_rng()

    augmented = []
    for _ in range(count):
        variant = sequence.copy()
        num_methods = int(rng.integers(2, 4))
        chosen = rng.choice(len(_METHODS), size=num_methods, replace=False)
        for idx in chosen:
            variant = _METHODS[idx](variant, rng)
        augmented.append(variant.astype(np.float32))
    return augmented
