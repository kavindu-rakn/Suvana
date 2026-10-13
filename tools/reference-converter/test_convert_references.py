"""Converter control-flow tests; temporary placeholders are not SSL recordings."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    "converter", Path(__file__).with_name("convert_references.py")
)
converter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(converter)


class VideoEnumerationTests(unittest.TestCase):
    def test_formats_are_case_insensitive_and_direct_files_only(self):
        # Empty files test enumeration only; none are SSL recordings.
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            names = ["clip1.mp4", "clip2.MOV", "clip3.MP4", "clip4.m4v", "clip5.AVI", "clip6.MkV"]
            for name in names:
                (folder / name).touch()
            (folder / "notes.txt").touch()
            (folder / "folder.mov").mkdir()
            (folder / "folder.mov" / "nested.mp4").touch()
            self.assertEqual({p.name for p in converter.video_files(folder)}, set(names))

    def test_nested_and_flat_isolated_clips_reach_conversion(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            category = root / "dataset" / "fixture-category"
            nested = category / "fixture-item"
            nested.mkdir(parents=True)
            clips = [nested / "take.MOV", category / "fixture-flat.MP4"]
            for clip in clips:
                clip.touch()
            model = root / "model.task"
            model.touch()
            with patch.object(sys, "argv", ["converter", "--dataset", str(category.parent),
                                           "--category", category.name, "--model", str(model),
                                           "--out", str(root / "out"), "--dry-run"]), \
                    patch.object(converter, "convert_one", return_value=None) as convert, \
                    contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(converter.main(), 0)
            self.assertEqual({call.args[0] for call in convert.call_args_list}, set(clips))


class SentenceConverterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dataset = self.root / "dataset"
        self.sentences = self.dataset / converter.SENTENCE_CATEGORY
        self.sentences.mkdir(parents=True)
        self.out = self.root / "references"
        self.model = self.root / "placeholder-model.task"
        self.model.touch()  # Never loaded: conversion is mocked in these tests.

    def clip(self, name, folder=None):
        path = (folder or self.sentences) / name
        path.touch()
        return path

    def run_cli(self, *arguments):
        output = io.StringIO()
        with patch.object(sys, "argv", ["converter", "--dataset", str(self.dataset),
                                      "--model", str(self.model), "--out", str(self.out),
                                      *arguments]), contextlib.redirect_stdout(output):
            result = converter.main()
        return result, output.getvalue()

    def fake_conversion(self, video, temp, args, gloss, variant, category):
        target = temp / video.name.replace(".mp4", ".json")
        target.write_text(json.dumps({
            "sourceFile": video.name, "sourceLabel": video.stem,
            "sourceCategory": category, "gloss": gloss,
            "licence": args.licence, "source": args.source_id,
        }), encoding="utf-8")
        return {"path": target, "gloss": gloss, "variant": variant,
                "sourceFile": video.name, "frames": 1, "durationMs": 100, "coverage": 1}

    def test_inventory_preserves_verbatim_labels_without_model_or_output(self):
        self.clip("Mage nama.mp4")  # Filename already documented in README.
        self.clip("001.MP4")  # Numeric placeholder exercises the evidence flag.
        self.clip("clip (1).MOV")  # Synthetic punctuation/case fixture.
        self.model.unlink()
        with patch.object(converter, "convert_one") as convert:
            result, output = self.run_cli("--list-sentences")
        report = json.loads(output)
        self.assertEqual(result, 0)
        self.assertEqual(report["count"], 3)
        self.assertCountEqual([c["sourceLabel"] for c in report["clips"]],
                              ["001", "Mage nama", "clip (1)"])
        self.assertTrue(report["clips"][0]["numericLabel"])
        self.assertTrue(all(c["sourceDurationMs"] is None for c in report["clips"]))
        self.assertFalse(self.out.exists())
        convert.assert_not_called()

    def test_inventory_does_not_run_manifest_writer_when_selectors_conflict(self):
        with patch.object(converter, "write_manifest") as write:
            with self.assertRaisesRegex(SystemExit, "separately"):
                self.run_cli("--list-sentences", "--manifest-only")
        write.assert_not_called()
        self.assertFalse(self.out.exists())

    def test_extension_only_clip_is_counted_but_never_given_a_label(self):
        self.clip(".mp4")
        self.clip("Mage nama.mp4")
        report = converter.sentence_inventory(self.dataset)
        self.assertEqual((report["count"], report["labelledCount"], report["unlabelledCount"]), (2, 1, 1))
        unnamed = next(c for c in report["clips"] if c["sourceFile"] == ".mp4")
        self.assertIsNone(unnamed["sourceLabel"])
        self.assertIsNone(unnamed["referenceFile"])
        with patch.object(converter, "convert_one", side_effect=self.fake_conversion) as convert:
            result, output = self.run_cli("--sentences")
        self.assertEqual(result, 0)
        self.assertEqual(convert.call_count, 1)
        self.assertIn("Ignoring 1 clip(s) with no usable label", output)

    def test_metadata_probe_failure_is_unknown_not_fabricated_duration(self):
        self.clip("Mage nama.mp4")
        with patch.object(converter.subprocess, "run", side_effect=subprocess.TimeoutExpired("probe", 15)):
            report = converter.sentence_inventory(self.dataset, probe_durations=True)
        self.assertIsNone(report["clips"][0]["sourceDurationMs"])
        self.assertIn("timed out", report["clips"][0]["metadataError"])
        self.assertFalse(self.out.exists())

    def test_metadata_probe_reports_container_duration(self):
        self.clip("Mage nama.mp4")
        response = SimpleNamespace(returncode=0, stdout='{"sourceDurationMs": 4000}', stderr="")
        with patch.object(converter.subprocess, "run", return_value=response) as probe:
            report = converter.sentence_inventory(self.dataset, probe_durations=True)
        self.assertEqual(report["clips"][0]["sourceDurationMs"], 4000)
        self.assertEqual(probe.call_args.kwargs["timeout"], 15)
        self.assertEqual(report["durationBasis"], "container frame count / FPS")

    def test_duration_reader_releases_capture_and_rejects_invalid_metadata(self):
        capture = Mock()
        capture.isOpened.return_value = True
        cv2 = SimpleNamespace(VideoCapture=Mock(return_value=capture),
                              CAP_PROP_FPS=1, CAP_PROP_FRAME_COUNT=2)
        for fps, frames, expected in [(25, 100, 4000), (0, 100, None), (float("nan"), 100, None)]:
            with self.subTest(fps=fps), patch.dict(sys.modules, {"cv2": cv2}):
                capture.reset_mock()
                capture.get.side_effect = [fps, frames]
                if expected is None:
                    with self.assertRaises(ValueError):
                        converter.probe_video_duration(Path("placeholder.mp4"))
                else:
                    self.assertEqual(converter.probe_video_duration(Path("placeholder.mp4")), expected)
                capture.release.assert_called_once()

    def test_sentence_conversion_keeps_label_and_separate_manifest_entry(self):
        self.clip("clip (1).mp4")
        self.out.mkdir()
        (self.out / "existing.json").write_text("{}")
        with patch.object(converter, "convert_one", side_effect=self.fake_conversion) as convert:
            self.assertEqual(self.run_cli("--sentences")[0], 0)
        recording = json.loads((self.out / "kaggle_sent_CLIP_1.json").read_text())
        self.assertEqual(recording["sourceLabel"], "clip (1)")
        self.assertEqual(recording["gloss"], "CLIP (1)")
        self.assertEqual(recording["sourceCategory"], "SSL Sentences")
        self.assertEqual(recording["licence"], "CC0-1.0")
        self.assertEqual(convert.call_args.args[2].prefix, "kaggle_sent_")
        self.assertEqual(json.loads((self.out / "manifest.json").read_text())["files"],
                         ["existing.json", "kaggle_sent_CLIP_1.json"])

    def test_explicit_sentence_category_also_uses_sentence_prefix(self):
        self.clip("Mage nama.mp4")
        with patch.object(converter, "convert_one", side_effect=self.fake_conversion):
            self.assertEqual(self.run_cli("--category", "SSL Sentences")[0], 0)
        self.assertTrue((self.out / "kaggle_sent_MAGE_NAMA.json").exists())

    def test_sentence_dry_run_never_writes_reference_outputs(self):
        self.clip("Mage nama.mp4")
        with patch.object(converter, "convert_one", side_effect=self.fake_conversion):
            self.assertEqual(self.run_cli("--sentences", "--dry-run")[0], 0)
        self.assertFalse(self.out.exists())

    def test_all_keeps_sentences_out_of_isolated_sign_namespace(self):
        self.clip("Mage nama.mp4")
        letters = self.dataset / "A-Z"
        letters.mkdir()
        self.clip("A.mp4", letters)
        with patch.object(converter, "convert_one", side_effect=self.fake_conversion) as convert:
            result, output = self.run_cli("--all")
        self.assertEqual(result, 0)
        self.assertEqual(convert.call_count, 1)
        self.assertEqual(convert.call_args.args[0].name, "A.mp4")
        self.assertEqual(convert.call_args.args[2].prefix, "kaggle_")
        self.assertIn("SSL Sentences excluded", output)

    def test_colliding_sentence_ids_fail_before_conversion_or_output(self):
        self.clip("clip-1.mp4")
        self.clip("clip_1.mp4")
        with patch.object(converter, "convert_one") as convert:
            with self.assertRaisesRegex(SystemExit, "colliding"):
                self.run_cli("--sentences")
        convert.assert_not_called()
        self.assertFalse(self.out.exists())

    def test_mixed_categories_and_wrong_prefix_are_rejected(self):
        for args in [("--sentences", "--all"),
                     ("--category", "SSL Sentences", "--category", "A-Z"),
                     ("--sentences", "--prefix", "yohan_")]:
            with self.subTest(args=args), self.assertRaises(SystemExit):
                self.run_cli(*args)
        self.assertFalse(self.out.exists())


if __name__ == "__main__":
    unittest.main()
