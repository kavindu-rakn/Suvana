"""Transport-only Suvana tests; never import the model or regenerate labels."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "webapp"))
from suvana_platform import public_connection_config


def test_unset_setting_preserves_existing_info_contract(monkeypatch):
    monkeypatch.delenv("RECOGNIZE_PUBLIC_ORIGIN", raising=False)
    assert public_connection_config() == {}
    monkeypatch.setenv("RECOGNIZE_PUBLIC_ORIGIN", "")
    assert public_connection_config() == {}


def test_public_origin_is_supplied_by_environment(monkeypatch):
    monkeypatch.setenv("RECOGNIZE_PUBLIC_ORIGIN", "https://recognition.example.invalid/")
    assert public_connection_config() == {"publicOrigin": "https://recognition.example.invalid"}


@pytest.mark.parametrize("origin", [
    "//example.invalid", "javascript:alert(1)", "https://example.invalid/path",
    "https://user:password@example.invalid", "https://example.invalid?x=1",
])
def test_invalid_public_origin_is_rejected(monkeypatch, origin):
    monkeypatch.setenv("RECOGNIZE_PUBLIC_ORIGIN", origin)
    with pytest.raises(ValueError, match="RECOGNIZE_PUBLIC_ORIGIN"):
        public_connection_config()
