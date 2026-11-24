"""
Smart Parking · Escáner de caseta

Lee la credencial QR, (opcional) lee la placa con una segunda cámara, consulta al servidor
y ordena al Arduino abrir la pluma o negar el acceso.

  python scanner.py               inicia la caseta
  python scanner.py --configurar  elige las cámaras de QR y de placas
  python scanner.py --probar      revisa servidor, clave y Arduino, sin cámaras
  python scanner.py --token XXXX  simula una lectura de QR sin cámara

Teclas en la ventana: Q salir · A abrir manualmente · C cerrar la pluma
"""
from __future__ import annotations

import argparse
import logging
import re
import signal
import sys
import threading
import time
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

import config as cfg
from api_client import Api, Resultado
from arduino_link import Arduino
from plates import LectorPlacas, coinciden, votar

TOKEN_RE = re.compile(r"^[a-f0-9]{32}$")
log = logging.getLogger("caseta")


# ───────── Registro (consola + archivo diario) ─────────
def configurar_logs() -> None:
    carpeta = Path(cfg.BASE_DIR) / "logs"
    carpeta.mkdir(exist_ok=True)
    fmt = logging.Formatter("%(asctime)s  %(levelname)-7s %(name)-8s %(message)s", "%H:%M:%S")
    consola = logging.StreamHandler(sys.stdout)
    consola.setFormatter(fmt)
    archivo = TimedRotatingFileHandler(carpeta / "caseta.log", when="midnight", backupCount=30, encoding="utf-8")
    archivo.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logging.basicConfig(level=logging.INFO, handlers=[consola, archivo])


def ocultar(token: str) -> str:
    """Nunca se escribe el token completo en los registros."""
    return f"{token[:6]}…" if len(token) > 6 else "…"


# ───────── Decodificación de QR ─────────
class DecodificadorQR:
    def __init__(self):
        try:
            from pyzbar.pyzbar import ZBarSymbol, decode

            self._decode = lambda img: [o.data.decode("utf-8", "ignore") for o in decode(img, symbols=[ZBarSymbol.QRCODE])]
            self.motor = "pyzbar"
        except Exception as e:  # falta libzbar en Windows (Visual C++ 2013)
            import cv2

            log.warning("pyzbar no disponible (%s). Uso el lector de OpenCV.", e.__class__.__name__)
            det = cv2.QRCodeDetector()

            def _cv(img):
                texto, _, _ = det.detectAndDecode(img)
                return [texto] if texto else []

            self._decode = _cv
            self.motor = "opencv"

    def leer(self, frame) -> list[str]:
        import cv2

        gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        try:
            return [t.strip() for t in self._decode(gris) if t and t.strip()]
        except Exception:
            return []


# ───────── Lógica de la caseta ─────────
class Caseta:
    def __init__(self, c: cfg.Config):
        self.c = c
        self.api = Api(c.app_url, c.api_key, c.request_timeout)
        self.arduino = Arduino(c.serial_port, c.baudrate)
        self.ocr: LectorPlacas | None = None
        self.cam_placa = None
        self._ultimos: dict[str, float] = {}
        self._ocupado = threading.Lock()
        self.estado = ("Muestra tu QR", (200, 200, 200))
        self.estado_hasta = 0.0

    # Estado visible en la ventana
    def mostrar(self, texto: str, color: tuple[int, int, int], segundos: float = 4):
        self.estado = (texto, color)
        self.estado_hasta = time.time() + segundos

    def en_cooldown(self, token: str) -> bool:
        ahora = time.time()
        # Limpia entradas viejas para que el diccionario no crezca sin límite.
        for t, ts in list(self._ultimos.items()):
            if ahora - ts > self.c.cooldown_seconds:
                del self._ultimos[t]
        return token in self._ultimos

    def leer_placa(self) -> str | None:
        if not (self.ocr and self.cam_placa):
            return None
        self.arduino.info("LEYENDO PLACA", "Espera un momento")
        lecturas: list[str] = []
        fin = time.time() + self.c.plate_timeout
        while time.time() < fin:
            frame = self.cam_placa.cuadro()
            if frame is None:
                time.sleep(0.05)
                continue
            lecturas += self.ocr.leer(frame)
            elegida = votar(lecturas, self.c.plate_votes)
            if elegida:
                return elegida
        return votar(lecturas, 1)

    def procesar(self, token: str) -> None:
        """Se ejecuta en un hilo aparte para no congelar el video."""
        if not self._ocupado.acquire(blocking=False):
            return
        try:
            self._ultimos[token] = time.time()
            if not TOKEN_RE.match(token):
                log.warning("QR con formato inválido")
                self.arduino.deny("QR NO VALIDO", "Usa tu QR")
                self.mostrar("QR no válido", (60, 60, 220))
                return

            log.info("QR leído %s", ocultar(token))
            self.mostrar("Verificando...", (0, 200, 255), 15)
            placa_leida = self.leer_placa() if self.c.plate_check == "on" else None
            if self.c.plate_check == "on":
                log.info("Placa leída por la cámara: %s", placa_leida or "ninguna")

            r: Resultado = self.api.escanear(token, placa_leida)
            if r.ignorar:
                log.info("Lectura duplicada ignorada por el servidor")
                self.mostrar("Lectura duplicada", (200, 200, 200), 2)
                return

            if r.abrir:
                tipo = (r.tipo or "acceso").upper()
                placa = r.placa or ""
                linea2 = f"{placa[:3]} {placa[3:]}".strip() if placa else (r.nombre or "Bienvenido")
                if r.placa_coincide is False:
                    log.warning("Placa leída %s distinta a la registrada %s", placa_leida, placa)
                elif self.c.plate_check == "on" and r.placa_coincide is None and placa_leida and placa and not coinciden(placa, placa_leida):
                    log.warning("Placa leída %s distinta a %s (el servidor no verifica placas)", placa_leida, placa)
                ok = self.arduino.open(tipo, linea2)
                log.info("ACCESO %s · %s · %s%s", tipo, placa, r.nombre or "", "" if ok else " · (pluma sin conexión)")
                self.mostrar(f"{tipo} {placa}  {r.nombre or ''}", (80, 200, 80), 5)
            else:
                # Fallar cerrado: ante cualquier error la pluma NO se abre.
                self.arduino.deny(r.motivo, placa_leida or "")
                log.warning("DENEGADO · %s", r.motivo)
                self.mostrar(f"Denegado: {r.motivo}", (60, 60, 220), 5)
        finally:
            self._ocupado.release()

    def apertura_manual(self):
        log.warning("APERTURA MANUAL por el operador de caseta (%s)", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        self.arduino.open("APERTURA", "MANUAL")
        self.mostrar("Apertura manual", (0, 200, 255), 4)


# ───────── Modos de ejecución ─────────
def modo_probar(c: cfg.Config) -> int:
    print(f"\nServidor: {c.app_url}")
    ok, msg = Api(c.app_url, c.api_key, c.request_timeout).probar()
    print(f"  {'OK ' if ok else 'ERR'} {msg}")
    a = Arduino(c.serial_port, c.baudrate)
    if a.disabled:
        print("  --  Arduino desactivado (SERIAL_PORT=none o falta pyserial)")
    elif a.connect():
        a.info("PRUEBA OK", "Smart Parking")
        print(f"  OK  Arduino conectado ({a._ser.port}); revisa que el LCD diga PRUEBA OK")
        a.close()
    else:
        print("  ERR No se pudo conectar con el Arduino (revisa el cable y SERIAL_PORT)")
        ok = False
    print(f"  --  Cámaras guardadas: QR={c.qr_camera} placas={c.plate_camera}  (cambia con --configurar)")
    print(f"  --  Verificación de placa: {c.plate_check}\n")
    return 0 if ok else 1


def modo_token(c: cfg.Config, token: str) -> int:
    caseta = Caseta(c)
    caseta.procesar(token.strip())
    print(f"\nResultado: {caseta.estado[0]}\n")
    caseta.arduino.close()
    return 0


def modo_caseta(c: cfg.Config, mostrar_ventana: bool) -> int:
    import cv2

    from cameras import Camara

    if c.qr_camera is None:
        print("\nNo hay cámara configurada. Ejecuta primero:  python scanner.py --configurar\n")
        return 1

    caseta = Caseta(c)
    ok, msg = caseta.api.probar()
    (log.info if ok else log.error)("Servidor: %s", msg)
    if not ok:
        log.error("Sin servidor la pluma no se abrirá (falla cerrada). Revisa APP_URL y HARDWARE_API_KEY.")

    if not caseta.arduino.connect() and not caseta.arduino.disabled:
        log.warning("Sigo sin Arduino; reintentaré en cada lectura.")

    cam_qr = Camara("qr", c.qr_camera, *c.qr_res)
    if not cam_qr.iniciar():
        return 1

    if c.plate_check == "on":
        if c.plate_camera is None:
            log.warning("PLATE_CHECK=on pero no hay cámara de placas configurada; se omite la placa")
        else:
            caseta.cam_placa = Camara("placas", c.plate_camera, *c.plate_res)
            if caseta.cam_placa.iniciar():
                try:
                    caseta.ocr = LectorPlacas()
                except ImportError:
                    log.error("Falta easyocr: pip install -r requirements-ocr.txt (o usa PLATE_CHECK=off)")
                    caseta.cam_placa.detener()
                    caseta.cam_placa = None
            else:
                caseta.cam_placa = None

    decodificador = DecodificadorQR()
    log.info("Caseta lista · QR con %s · placa %s · Q para salir", decodificador.motor, "activada" if caseta.ocr else "desactivada")

    detener = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: detener.set())

    ultimo_analisis = 0.0
    try:
        while not detener.is_set():
            frame = cam_qr.cuadro()
            if frame is None:
                time.sleep(0.02)
                continue

            # Analiza ~12 veces por segundo; suficiente y deja CPU para el OCR.
            if time.time() - ultimo_analisis >= 0.08:
                ultimo_analisis = time.time()
                for token in decodificador.leer(frame):
                    if not caseta.en_cooldown(token) and not caseta._ocupado.locked():
                        threading.Thread(target=caseta.procesar, args=(token,), daemon=True).start()
                        break

            if mostrar_ventana:
                texto, color = caseta.estado if time.time() < caseta.estado_hasta else ("Muestra tu QR", (200, 200, 200))
                h, w = frame.shape[:2]
                cv2.rectangle(frame, (0, h - 56), (w, h), (20, 20, 20), -1)
                cv2.putText(frame, texto[:60], (16, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2, cv2.LINE_AA)
                pluma = "Pluma: conectada" if caseta.arduino.connected else ("Pluma: desactivada" if caseta.arduino.disabled else "Pluma: SIN CONEXION")
                cv2.putText(frame, pluma, (16, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (80, 200, 80) if caseta.arduino.connected else (60, 60, 220), 2, cv2.LINE_AA)
                cv2.imshow("Smart Parking - Caseta", frame)
                tecla = cv2.waitKey(1) & 0xFF
                if tecla in (ord("q"), ord("Q"), 27):
                    break
                if tecla in (ord("a"), ord("A")):
                    caseta.apertura_manual()
                if tecla in (ord("c"), ord("C")):
                    caseta.arduino.close_barrier()
            else:
                time.sleep(0.01)
    finally:
        cam_qr.detener()
        if caseta.cam_placa:
            caseta.cam_placa.detener()
        caseta.arduino.close()
        if mostrar_ventana:
            cv2.destroyAllWindows()
        log.info("Caseta detenida")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Escáner de caseta de Smart Parking")
    p.add_argument("--configurar", action="store_true", help="elegir cámaras")
    p.add_argument("--probar", action="store_true", help="probar servidor y Arduino")
    p.add_argument("--token", help="simular la lectura de un QR")
    p.add_argument("--sin-ventana", action="store_true", help="no mostrar la ventana de video")
    args = p.parse_args()

    configurar_logs()

    if args.configurar:
        from cameras import asistente

        import os

        qr, placa = asistente(int(os.getenv("MAX_CAMERAS_TO_SCAN", "6") or 6))
        if qr is not None:
            cfg.save_cameras(qr, placa)
            print(f"\nGuardado: QR={qr}, placas={placa}\n")
        return 0

    c = cfg.load()
    if args.probar:
        return modo_probar(c)
    if args.token:
        return modo_token(c, args.token)
    return modo_caseta(c, c.show_window and not args.sin_ventana)


if __name__ == "__main__":
    sys.exit(main())
