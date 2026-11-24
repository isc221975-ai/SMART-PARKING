"""Lectura y comparación de placas. El OCR (easyocr) es opcional: PLATE_CHECK=on."""
from __future__ import annotations

import logging
import re
from collections import Counter

log = logging.getLogger("placas")

# Confusiones típicas del OCR: se igualan antes de comparar.
_CONFUSIONES = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8", "G": "6"})


def normalizar(texto: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", (texto or "").upper())


def parece_placa(texto: str) -> bool:
    """De 5 a 8 caracteres, con al menos una letra y un número."""
    return 5 <= len(texto) <= 8 and any(c.isalpha() for c in texto) and any(c.isdigit() for c in texto)


def _distancia(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def coinciden(registrada: str | None, leida: str | None) -> bool:
    """Tolera las confusiones del OCR y un carácter de diferencia."""
    a, b = normalizar(registrada), normalizar(leida)
    if not a or not b:
        return False
    if a == b:
        return True
    return _distancia(a.translate(_CONFUSIONES), b.translate(_CONFUSIONES)) <= 1


def votar(lecturas: list[str], minimo: int) -> str | None:
    if not lecturas:
        return None
    placa, votos = Counter(lecturas).most_common(1)[0]
    return placa if votos >= minimo else None


class LectorPlacas:
    """Envuelve easyocr. Se carga una sola vez porque tarda varios segundos."""

    def __init__(self):
        import os

        os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
        import easyocr  # noqa: E402  (pesado: solo se importa si PLATE_CHECK=on)

        log.info("Cargando el modelo de OCR (la primera vez descarga ~100 MB)...")
        self._reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        log.info("OCR listo")

    def leer(self, frame) -> list[str]:
        import cv2

        gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        alto, ancho = gris.shape[:2]
        if ancho > 960:
            escala = 960 / ancho
            gris = cv2.resize(gris, (960, int(alto * escala)))
        gris = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gris)
        resultados = self._reader.readtext(gris, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-", detail=1)
        placas = []
        for _, texto, confianza in resultados:
            t = normalizar(texto)
            if confianza >= 0.35 and parece_placa(t):
                placas.append(t)
        return placas
