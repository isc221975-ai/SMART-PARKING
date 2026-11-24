"""Configuración del escáner leída de scanner/.env (nunca claves dentro del código)."""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
CAMERA_CONFIG = BASE_DIR / "camera_config.json"

load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    return default if v is None else v.strip().lower() in {"1", "true", "si", "sí", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Config:
    app_url: str
    api_key: str
    request_timeout: float
    cooldown_seconds: int
    serial_port: str          # "auto", "none" o p. ej. "COM3"
    baudrate: int
    plate_check: str          # "off" | "on"
    plate_timeout: float
    plate_votes: int
    max_cameras: int
    show_window: bool
    qr_camera: int | None
    plate_camera: int | None
    qr_res: tuple[int, int]
    plate_res: tuple[int, int]


def _res(name: str, default: str) -> tuple[int, int]:
    try:
        w, h = os.getenv(name, default).lower().split("x")
        return int(w), int(h)
    except ValueError:
        w, h = default.split("x")
        return int(w), int(h)


def load_cameras() -> tuple[int | None, int | None]:
    if not CAMERA_CONFIG.exists():
        return None, None
    try:
        data = json.loads(CAMERA_CONFIG.read_text(encoding="utf-8"))
        qr = data.get("qr_camera_index")
        plate = data.get("plate_camera_index")
        return (qr if isinstance(qr, int) else None, plate if isinstance(plate, int) else None)
    except (OSError, json.JSONDecodeError):
        return None, None


def save_cameras(qr: int | None, plate: int | None) -> None:
    CAMERA_CONFIG.write_text(
        json.dumps({"qr_camera_index": qr, "plate_camera_index": plate}, indent=2), encoding="utf-8"
    )


def load() -> Config:
    app_url = os.getenv("APP_URL", "").strip().rstrip("/")
    api_key = os.getenv("HARDWARE_API_KEY", "").strip()
    errores = []
    if not app_url.startswith(("http://", "https://")):
        errores.append("APP_URL debe empezar con http:// o https:// (ej. http://localhost:3000)")
    if len(api_key) < 16:
        errores.append("HARDWARE_API_KEY falta o es muy corta (mínimo 16 caracteres, la misma que en .env.local de la web)")
    if errores:
        print("\n[CONFIG] Revisa scanner/.env:\n  - " + "\n  - ".join(errores) + "\n")
        sys.exit(1)

    plate_check = os.getenv("PLATE_CHECK", "off").strip().lower()
    if plate_check not in {"off", "on"}:
        plate_check = "off"

    qr, plate = load_cameras()
    return Config(
        app_url=app_url,
        api_key=api_key,
        request_timeout=_float("REQUEST_TIMEOUT", 6.0),
        cooldown_seconds=_int("COOLDOWN_SECONDS", 10),
        serial_port=os.getenv("SERIAL_PORT", "auto").strip() or "auto",
        baudrate=_int("BAUDRATE", 9600),
        plate_check=plate_check,
        plate_timeout=_float("PLATE_TIMEOUT", 4.0),
        plate_votes=_int("PLATE_VOTES", 2),
        max_cameras=_int("MAX_CAMERAS_TO_SCAN", 6),
        show_window=_bool("SHOW_WINDOW", True),
        qr_camera=qr,
        plate_camera=plate,
        qr_res=_res("QR_CAMERA_RES", "1280x720"),
        plate_res=_res("PLATE_CAMERA_RES", "1920x1080"),
    )
