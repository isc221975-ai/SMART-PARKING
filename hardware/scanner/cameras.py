"""Cámaras: captura en hilo propio (siempre el cuadro más reciente) y asistente de selección."""
from __future__ import annotations

import logging
import platform
import threading
import time

import cv2

log = logging.getLogger("camaras")
BACKEND = cv2.CAP_DSHOW if platform.system() == "Windows" else cv2.CAP_ANY


def abrir(indice: int, ancho: int, alto: int):
    cap = cv2.VideoCapture(indice, BACKEND)
    if not cap.isOpened():
        return None
    # MJPG: por USB 2.0 el formato sin comprimir limita 1080p a ~5 FPS.
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, ancho)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, alto)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cap


class Camara:
    """Lee en segundo plano y guarda solo el último cuadro: nada de retrasos acumulados."""

    def __init__(self, nombre: str, indice: int, ancho: int = 1280, alto: int = 720):
        self.nombre, self.indice, self.ancho, self.alto = nombre, indice, ancho, alto
        self._frame = None
        self._lock = threading.Lock()
        self._vivo = False
        self._cap = None
        self._hilo: threading.Thread | None = None

    def iniciar(self) -> bool:
        self._cap = abrir(self.indice, self.ancho, self.alto)
        if self._cap is None:
            log.error("No se pudo abrir la cámara %s (índice %s)", self.nombre, self.indice)
            return False
        self._vivo = True
        self._hilo = threading.Thread(target=self._bucle, name=f"cam-{self.nombre}", daemon=True)
        self._hilo.start()
        log.info("Cámara %s lista (índice %s)", self.nombre, self.indice)
        return True

    def _bucle(self):
        fallos = 0
        while self._vivo:
            ok, frame = self._cap.read()
            if not ok:
                fallos += 1
                if fallos > 50:  # ~ unos segundos sin imagen: reintentar abrir
                    log.warning("Cámara %s sin imagen, reintentando...", self.nombre)
                    self._cap.release()
                    time.sleep(1)
                    self._cap = abrir(self.indice, self.ancho, self.alto) or self._cap
                    fallos = 0
                time.sleep(0.02)
                continue
            fallos = 0
            with self._lock:
                self._frame = frame

    def cuadro(self):
        with self._lock:
            return None if self._frame is None else self._frame.copy()

    def detener(self):
        self._vivo = False
        if self._hilo:
            self._hilo.join(timeout=2)
        if self._cap is not None:
            self._cap.release()


def listar(max_indices: int) -> list[int]:
    disponibles = []
    for i in range(max_indices):
        cap = cv2.VideoCapture(i, BACKEND)
        if cap.isOpened():
            ok, _ = cap.read()
            if ok:
                disponibles.append(i)
        cap.release()
    return disponibles


def asistente(max_indices: int) -> tuple[int | None, int | None]:
    """Muestra cada cámara disponible y pregunta cuál usar para QR y cuál para placas."""
    print("\nBuscando cámaras...")
    disponibles = listar(max_indices)
    if not disponibles:
        print("No se encontró ninguna cámara. Conecta la cámara USB y vuelve a intentar.")
        return None, None
    print(f"Cámaras encontradas: {disponibles}")
    print("Se abrirá una vista previa de cada una. Presiona cualquier tecla para pasar a la siguiente.\n")
    for i in disponibles:
        cap = abrir(i, 640, 480)
        if cap is None:
            continue
        fin = time.time() + 6
        while time.time() < fin:
            ok, frame = cap.read()
            if ok:
                cv2.putText(frame, f"Camara {i}", (16, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 200, 120), 2)
                cv2.imshow("Vista previa", frame)
            if cv2.waitKey(30) != -1:
                break
        cap.release()
    cv2.destroyAllWindows()

    def preguntar(texto: str, permitir_ninguna: bool) -> int | None:
        while True:
            extra = " (Enter = ninguna)" if permitir_ninguna else ""
            r = input(f"{texto} {disponibles}{extra}: ").strip()
            if not r and permitir_ninguna:
                return None
            if r.isdigit() and int(r) in disponibles:
                return int(r)
            print("Opción no válida.")

    qr = preguntar("Número de la cámara que lee el QR", False)
    placa = preguntar("Número de la cámara que ve la placa", True)
    return qr, placa
