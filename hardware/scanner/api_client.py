"""Cliente de la API de Smart Parking (POST /api/hardware/scan)."""
from __future__ import annotations

import logging
from dataclasses import dataclass

import requests

log = logging.getLogger("api")


@dataclass
class Resultado:
    abrir: bool
    tipo: str | None = None          # "entrada" | "salida"
    placa: str | None = None
    nombre: str | None = None
    motivo: str = ""                  # texto corto para el LCD y la consola
    codigo: str = ""                  # código de error del servidor, si lo hay
    placa_coincide: bool | None = None
    ignorar: bool = False             # lectura duplicada: no hacer nada


class Api:
    def __init__(self, base_url: str, api_key: str, timeout: float):
        self.url = f"{base_url}/api/hardware/scan"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"x-api-key": api_key, "Content-Type": "application/json", "User-Agent": "SmartParking-Caseta/2.0"})

    def probar(self) -> tuple[bool, str]:
        """Comprueba URL y clave enviando un token con formato inválido (no registra nada)."""
        try:
            r = self.session.post(self.url, json={"token": "prueba"}, timeout=self.timeout)
        except requests.RequestException as e:
            return False, f"No hay conexión con {self.url}: {e.__class__.__name__}"
        if r.status_code == 401:
            return False, "La clave HARDWARE_API_KEY no coincide con la del servidor"
        if r.status_code == 503:
            return False, "El servidor no tiene configurada HARDWARE_API_KEY"
        if r.status_code in (400, 404, 422):
            return True, "Servidor y clave correctos"
        return False, f"Respuesta inesperada del servidor ({r.status_code})"

    def escanear(self, token: str, placa_leida: str | None) -> Resultado:
        try:
            r = self.session.post(self.url, json={"token": token, "qr_token": token, "placa_leida": placa_leida}, timeout=self.timeout)
            data = r.json() if r.content else {}
        except requests.Timeout:
            return Resultado(False, motivo="SIN RESPUESTA", codigo="TIMEOUT")
        except (requests.RequestException, ValueError) as e:
            log.error("Error de red: %s", e)
            return Resultado(False, motivo="SIN CONEXION", codigo="RED")

        accion = str(data.get("action", "")).upper()
        if r.ok and (accion == "OPEN" or data.get("ok")):
            vehiculo = data.get("vehiculo") or {}
            return Resultado(
                True,
                tipo=data.get("tipo"),
                placa=data.get("placa") or vehiculo.get("placa"),
                nombre=data.get("nombre"),
                placa_coincide=data.get("placa_coincide"),
            )
        if accion == "IGNORE" or data.get("code") == "DUPLICADO":
            return Resultado(False, ignorar=True, codigo="DUPLICADO")

        codigo = str(data.get("code") or r.status_code)
        motivos = {
            "400": "QR NO VALIDO",
            "401": "ERROR DE CLAVE",
            "429": "ESPERA UN MOMENTO",
            "503": "SERVIDOR SIN CLAVE",
            "PLACA_NO_COINCIDE": "PLACA NO COINCIDE",
            "SIN_PLACA": "PLACA NO LEIDA",
            "NO_REGISTRADO": "QR NO REGISTRADO",
            "QR_INVALIDO": "QR NO VALIDO",
        }
        motivo = motivos.get(codigo) or ("QR NO REGISTRADO" if r.status_code == 404 else "ACCESO DENEGADO")
        log.warning("Servidor rechazó la lectura (%s): %s", r.status_code, data.get("error"))
        return Resultado(False, motivo=motivo, codigo=codigo, placa=data.get("placa"))
