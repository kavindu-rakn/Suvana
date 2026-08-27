"""Unit tests for src/data_preprocessing/keypoint_augmentation.py.

These cover the landmark-sequence augmentation helpers used to expand the
training set. Every function here is pure NumPy, so the tests are fast and
fully deterministic: wherever randomness is involved we pass a seeded
``np.random.default_rng`` so runs are reproducible.

Key invariants being pinned down:

* Shape and dtype are preserved (the model expects fixed (frames, features)
  float32 sequences).
* Padding coordinates (exact 0.0 values, which mark undetected landmarks) are
  left untouched by the spatial augmentations -- jitter/translate/scale must
  not turn "no landmark" into a phantom landmark.
* The depth (z) channel is left alone by the 2D translate/scale augmentations.
* ``generate_augmented_sequences`` is reproducible under a fixed seed and does
  not mutate its input.

No production source is imported beyond the module under test.
"""

import sys
from pathlib import Path

import numpy as np

# Match the import convention used by the existing tests (tests/test_recognition.py).
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from data_preprocessing.keypoint_augmentation import (  # noqa: E402
    _METHODS,
    _frame_hold,
    _jitter,
    _linear_resample,
    _scale,
    _time_warp,
    _translate,
    generate_augmented_sequences,
)


def _make_sequence(frames=8, landmarks=3, seed=1234):
    """A (frames, landmarks*3) float32 sequence with a few zeroed-out slots.

    landmarks*3 keeps the x/y/z column layout (cols 0::3 = x, 1::3 = y,
    2::3 = z) that translate/scale rely on. Two coordinate slots are forced to
    0.0 so we can assert padding is preserved.
    """
    rng = np.random.default_rng(seed)
    seq = rng.uniform(0.1, 0.9, size=(frames, landmarks * 3)).astype(np.float32)
    # Force a couple of "undetected landmark" padding slots to exactly 0.0.
    seq[0, 0] = 0.0  # an x coordinate
    seq[2, 1] = 0.0  # a y coordinate
    return seq


# ---------------------------------------------------------------------------
# _linear_resample
# ---------------------------------------------------------------------------

def test_linear_resample_same_length_returns_equal_copy():
    seq = _make_sequence(frames=4)
    out = _linear_resample(seq, 4)

    assert out.shape == seq.shape
    assert np.array_equal(out, seq)
    # Must be a copy, not the same object -- callers mutate the result.
    assert out is not seq


def test_linear_resample_does_not_mutate_input():
    seq = _make_sequence(frames=5)
    before = seq.copy()
    _linear_resample(seq, 9)
    assert np.array_equal(seq, before)


def test_linear_resample_upsample_preserves_endpoints_and_interpolates_midpoint():
    # Two frames ramping 0 -> 10 on every feature.
    seq = np.array([[0.0, 0.0, 0.0], [10.0, 10.0, 10.0]], dtype=np.float32)
    out = _linear_resample(seq, 5)

    assert out.shape == (5, 3)
    # Endpoints are pinned to the original first/last frames.
    assert np.allclose(out[0], [0.0, 0.0, 0.0])
    assert np.allclose(out[-1], [10.0, 10.0, 10.0])
    # Middle sample (position 0.5 between the two frames) is the linear midpoint.
    assert np.allclose(out[2], [5.0, 5.0, 5.0])
    assert out.dtype == np.float32


def test_linear_resample_downsample_shape_and_endpoints():
    seq = _make_sequence(frames=10, landmarks=2)
    out = _linear_resample(seq, 4)

    assert out.shape == (4, seq.shape[1])
    # Downsampling from 10 -> 4 lands on integer source positions [0, 3, 6, 9],
    # so the first and last frames come through unchanged.
    assert np.allclose(out[0], seq[0])
    assert np.allclose(out[-1], seq[-1])


# ---------------------------------------------------------------------------
# _jitter
# ---------------------------------------------------------------------------

def test_jitter_preserves_padding_zeros_and_perturbs_the_rest():
    seq = _make_sequence()
    rng = np.random.default_rng(0)
    out = _jitter(seq, rng, sigma=0.01)

    assert out.shape == seq.shape
    assert out.dtype == np.float32
    # Zero (padding) slots stay exactly zero.
    zero_mask = seq == 0.0
    assert np.all(out[zero_mask] == 0.0)
    # Non-zero slots are actually perturbed (not a no-op).
    assert not np.array_equal(out[~zero_mask], seq[~zero_mask])


def test_jitter_is_reproducible_with_same_seed():
    seq = _make_sequence()
    a = _jitter(seq, np.random.default_rng(7))
    b = _jitter(seq, np.random.default_rng(7))
    assert np.array_equal(a, b)


# ---------------------------------------------------------------------------
# _translate
# ---------------------------------------------------------------------------

def test_translate_leaves_z_channel_untouched_and_keeps_zeros():
    seq = _make_sequence()
    rng = np.random.default_rng(3)
    out = _translate(seq, rng, max_shift=0.03)

    assert out.shape == seq.shape
    assert out.dtype == np.float32
    # z coordinates (cols 2::3) are a 2D translation's blind spot -> unchanged.
    assert np.array_equal(out[:, 2::3], seq[:, 2::3])
    # Padding zeros in x/y remain zero.
    xy_zero_mask = (seq == 0.0)
    xy_zero_mask[:, 2::3] = False  # ignore z here; handled above
    assert np.all(out[xy_zero_mask] == 0.0)


def test_translate_shifts_nonzero_xy_by_a_constant_offset():
    # No zeros -> every x shifts by the same dx, every y by the same dy.
    seq = np.full((4, 6), 0.5, dtype=np.float32)
    out = _translate(seq, np.random.default_rng(11), max_shift=0.03)

    dx = out[:, 0::3] - seq[:, 0::3]
    dy = out[:, 1::3] - seq[:, 1::3]
    # A single scalar offset across the whole frame stack.
    assert np.allclose(dx, dx.flat[0])
    assert np.allclose(dy, dy.flat[0])


# ---------------------------------------------------------------------------
# _scale
# ---------------------------------------------------------------------------

def test_scale_fixes_center_point_and_preserves_zeros_and_z():
    # A coordinate sitting exactly at the 0.5 scaling center is invariant to the
    # scale factor, so we can assert it deterministically.
    seq = _make_sequence()
    seq[1, 0] = 0.5  # x at the center
    seq[1, 1] = 0.5  # y at the center
    rng = np.random.default_rng(5)
    out = _scale(seq, rng, max_delta=0.05)

    assert out.shape == seq.shape
    assert out.dtype == np.float32
    assert np.isclose(out[1, 0], 0.5)
    assert np.isclose(out[1, 1], 0.5)
    # z untouched by 2D scaling.
    assert np.array_equal(out[:, 2::3], seq[:, 2::3])
    # Padding zeros preserved in x/y.
    xy_zero_mask = (seq == 0.0)
    xy_zero_mask[:, 2::3] = False
    assert np.all(out[xy_zero_mask] == 0.0)


# ---------------------------------------------------------------------------
# _time_warp
# ---------------------------------------------------------------------------

def test_time_warp_preserves_frame_count_and_dtype():
    seq = _make_sequence(frames=8)
    out = _time_warp(seq, np.random.default_rng(2), max_ratio=0.15)

    # Warps time internally but always resamples back to the original length.
    assert out.shape == seq.shape
    assert out.dtype == np.float32


# ---------------------------------------------------------------------------
# _frame_hold
# ---------------------------------------------------------------------------

def test_frame_hold_short_sequence_is_returned_unchanged():
    seq = np.array([[0.1, 0.2, 0.3]], dtype=np.float32)  # single frame
    out = _frame_hold(seq, np.random.default_rng(0))
    assert np.array_equal(out, seq)


def test_frame_hold_duplicates_a_preceding_frame():
    # Start with all-distinct frames so any duplicated (held) frame is detectable
    # as a consecutive pair of identical rows.
    seq = (np.arange(8 * 3).reshape(8, 3)).astype(np.float32)
    out = _frame_hold(seq, np.random.default_rng(0), max_holds=2)

    assert out.shape == seq.shape
    consecutive_equal = [np.array_equal(out[i], out[i - 1]) for i in range(1, len(out))]
    assert any(consecutive_equal)


# ---------------------------------------------------------------------------
# generate_augmented_sequences
# ---------------------------------------------------------------------------

def test_method_registry_has_five_augmentations():
    assert len(_METHODS) == 5


def test_generate_returns_requested_count_with_matching_shape_and_dtype():
    seq = _make_sequence(frames=8)
    out = generate_augmented_sequences(seq, count=5, rng=np.random.default_rng(0))

    assert isinstance(out, list)
    assert len(out) == 5
    for variant in out:
        assert variant.shape == seq.shape
        assert variant.dtype == np.float32


def test_generate_zero_count_returns_empty_list():
    seq = _make_sequence()
    assert generate_augmented_sequences(seq, count=0, rng=np.random.default_rng(0)) == []


def test_generate_is_reproducible_under_a_fixed_seed():
    seq = _make_sequence(frames=8)
    first = generate_augmented_sequences(seq, count=4, rng=np.random.default_rng(42))
    second = generate_augmented_sequences(seq, count=4, rng=np.random.default_rng(42))

    assert len(first) == len(second) == 4
    for a, b in zip(first, second):
        assert np.array_equal(a, b)


def test_generate_differs_across_seeds():
    seq = _make_sequence(frames=8)
    a = generate_augmented_sequences(seq, count=4, rng=np.random.default_rng(1))
    b = generate_augmented_sequences(seq, count=4, rng=np.random.default_rng(2))

    # Different seeds should not produce an identical batch.
    all_identical = all(np.array_equal(x, y) for x, y in zip(a, b))
    assert not all_identical


def test_generate_does_not_mutate_input_sequence():
    seq = _make_sequence(frames=8)
    before = seq.copy()
    generate_augmented_sequences(seq, count=3, rng=np.random.default_rng(0))
    assert np.array_equal(seq, before)
