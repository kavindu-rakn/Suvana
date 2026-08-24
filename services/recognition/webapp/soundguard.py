import socket
from typing import List
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/soundguard", tags=["SoundGuard"])

DEFAULT_METRO_PORT = 8081


def get_local_ip() -> str:
    """Detect the most likely LAN IP address of the host machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # 8.8.8.8 doesn't need to be reachable; standard way to find primary network interface IP
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


def get_all_local_ips() -> List[str]:
    """Retrieve all available IPv4 addresses across network adapters."""
    ips = set()
    primary = get_local_ip()
    if primary and primary != "127.0.0.1":
        ips.add(primary)
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass
    if not ips:
        ips.add("127.0.0.1")
    return list(ips)


def is_metro_running(ip: str = "127.0.0.1", port: int = DEFAULT_METRO_PORT) -> bool:
    """Check whether Metro Bundler is currently listening on the specified port."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.35)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception:
        return False


@router.get("/info")
def get_soundguard_info(port: int = DEFAULT_METRO_PORT):
    """Return network configuration and Expo Go connection URL for SoundGuard."""
    primary_ip = get_local_ip()
    all_ips = get_all_local_ips()
    metro_active = is_metro_running("127.0.0.1", port) or is_metro_running(primary_ip, port)

    expo_url = f"exp://{primary_ip}:{port}"
    web_url = f"http://{primary_ip}:{port}"

    return JSONResponse({
        "status": "success",
        "primaryIp": primary_ip,
        "availableIps": all_ips,
        "port": port,
        "metroRunning": metro_active,
        "expoUrl": expo_url,
        "webUrl": web_url,
        "component": "SoundGuard (soundguard-karindra)",
        "package": "com.karindragimhan69.soundguard",
    })


@router.get("/status")
def get_metro_status(port: int = DEFAULT_METRO_PORT):
    """Quick health-check for Metro bundler connectivity."""
    primary_ip = get_local_ip()
    metro_active = is_metro_running("127.0.0.1", port) or is_metro_running(primary_ip, port)
    return JSONResponse({
        "metroRunning": metro_active,
        "port": port,
        "ip": primary_ip,
    })
