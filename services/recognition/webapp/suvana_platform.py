"""Optional Suvana transport configuration; no model or label behavior."""
import os
from urllib.parse import urlsplit


def public_connection_config():
    """Unset preserves the existing /api/info shape and same-host socket."""
    origin = os.environ.get("RECOGNIZE_PUBLIC_ORIGIN", "").strip()
    if not origin:
        return {}
    parsed = urlsplit(origin)
    if (parsed.scheme not in ("http", "https") or not parsed.hostname
            or parsed.username or parsed.password or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment):
        raise ValueError("RECOGNIZE_PUBLIC_ORIGIN must be an HTTP(S) origin without a path or credentials")
    return {"publicOrigin": f"{parsed.scheme}://{parsed.netloc}"}
