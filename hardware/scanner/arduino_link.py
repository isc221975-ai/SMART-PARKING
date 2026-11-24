"""Conexión serie con el Arduino de la pluma, con reconexión automática."""
from __future__ import annotations

import logging
import threading
import time
import unicodedata

log = logging.getLogger("arduino")

try:
    import serial
    from serial.tools import list_ports
except ImportError:  # pyserial no instalado
    serial = None
    list_ports = None


def lcd_text(texto: str) -> str:
    """Quita acentos y caracteres que el LCD no muestra; máximo 16 caracteres."""
    sin_acentos = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    limpio = "".join(c for c in sin_acentos if 32 <= ord(c) <= 126 and c != ";")
    return limpio.strip()[:16]


def detectar_puerto() -> str | None:
    if list_ports is None:
        return None
    candidatos = []
    for p in list_ports.comports():
        desc = f"{p.description} {p.manufacturer or ''}".lower()
        puntos = 0
        if "arduino" in desc:
            puntos = 3
        elif any(k in desc for k in ("ch340", "ch341", "usb-serial", "usb serial", "cp210", "ftdi", "wch")):
            puntos = 2
        elif p.vid is not None:
            puntos = 1
        if puntos:
            candidatos.append((puntos, p.device))
    candidatos.sort(reverse=True)
    return candidatos[0][1] if candidatos else None


class Arduino:
    """Envía OPEN/DENY/INFO. Si no hay Arduino, el escáner sigue funcionando y lo avisa."""

    def __init__(self, port: str, baudrate: int):
        self.port_cfg = port
        self.baudrate = baudrate
        self._ser = None
        self._lock = threading.Lock()
        self._ultimo_intento = 0.0
        self.disabled = port.lower() == "none"
        if serial is None and not self.disabled:
            log.warning("pyserial no está instalado: la pluma no se moverá (pip install pyserial)")
            self.disabled = True

    @property
    def connected(self) -> bool:
        return self._ser is not None and self._ser.is_open

    def connect(self) -> bool:
        if self.disabled:
            return False
        if self.connected:
            return True
        if time.time() - self._ultimo_intento < 3:
            return False
        self._ultimo_intento = time.time()
        port = detectar_puerto() if self.port_cfg.lower() == "auto" else self.port_cfg
        if not port:
            log.warning("No encontré el Arduino. Conéctalo por USB o define SERIAL_PORT (ej. COM3)")
            return False
        try:
            ser = serial.Serial(port, self.baudrate, timeout=0.2, write_timeout=1)
            # Al abrir el puerto el Arduino se reinicia: espera su READY (máx. 4 s).
            fin = time.time() + 4
            listo = False
            while time.time() < fin:
                linea = ser.readline().decode("ascii", "ignore").strip()
                if linea == "READY":
                    listo = True
                    break
            if not listo:
                ser.write(b"PING\n")
                listo = ser.readline().decode("ascii", "ignore").strip() == "PONG"
            if not listo:
                ser.close()
                log.warning("El puerto %s respondió, pero no parece la pluma de Smart Parking", port)
                return False
            self._ser = ser
            log.info("Arduino conectado en %s", port)
            return True
        except (serial.SerialException, OSError) as e:
            log.warning("No se pudo abrir %s: %s", port, e)
            return False

    def _send(self, linea: str) -> bool:
        with self._lock:
            if not self.connect():
                return False
            try:
                self._ser.reset_input_buffer()
                self._ser.write((linea + "\n").encode("ascii"))
                self._ser.flush()
                respuesta = self._ser.readline().decode("ascii", "ignore").strip()
                if respuesta.startswith("ERR"):
                    log.warning("Arduino: %s", respuesta)
                return True
            except (serial.SerialException, OSError) as e:
                log.warning("Se perdió la conexión con el Arduino: %s", e)
                self.close()
                return False

    def open(self, l1: str, l2: str) -> bool:
        return self._send(f"OPEN;{lcd_text(l1)};{lcd_text(l2)}")

    def deny(self, l1: str, l2: str = "") -> bool:
        return self._send(f"DENY;{lcd_text(l1)};{lcd_text(l2)}")

    def info(self, l1: str, l2: str = "") -> bool:
        return self._send(f"INFO;{lcd_text(l1)};{lcd_text(l2)}")

    def close_barrier(self) -> bool:
        return self._send("CLOSE")

    def close(self) -> None:
        try:
            if self._ser:
                self._ser.close()
        finally:
            self._ser = None
