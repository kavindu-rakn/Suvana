"""Compatibility entry point; all assistant data now has one verified generator.

Retained for existing local commands. Does not import inference or rewrite the
source label files. Requires Shell's existing Node build dependencies.
"""
import subprocess
import sys
from pathlib import Path

raise SystemExit(subprocess.call([
    "node", str(Path(__file__).with_name("build-knowledge-base.mjs")), *sys.argv[1:]
]))
