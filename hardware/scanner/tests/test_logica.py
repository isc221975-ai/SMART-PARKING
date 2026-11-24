"""Pruebas sin cámara ni Arduino:  python -m unittest discover tests"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from arduino_link import lcd_text  # noqa: E402
from plates import coinciden, normalizar, parece_placa, votar  # noqa: E402


class Placas(unittest.TestCase):
    def test_normalizar(self):
        self.assertEqual(normalizar("txa-48 21"), "TXA4821")

    def test_parece_placa(self):
        self.assertTrue(parece_placa("TXA4821"))
        self.assertFalse(parece_placa("MEXICO"))
        self.assertFalse(parece_placa("1234"))

    def test_coinciden_con_errores_de_ocr(self):
        self.assertTrue(coinciden("TXA4821", "TXA-4821"))
        self.assertTrue(coinciden("PUE7735", "PUE773S"))   # S leída por 5
        self.assertTrue(coinciden("TBO1020", "TB01020"))   # O leída por 0
        self.assertTrue(coinciden("TXA4821", "TXA482"))    # un carácter de menos
        self.assertFalse(coinciden("TXA4821", "PXL2087"))
        self.assertFalse(coinciden("TXA4821", None))

    def test_votar(self):
        self.assertEqual(votar(["TXA4821", "TXA4821", "TXA4B21"], 2), "TXA4821")
        self.assertIsNone(votar(["TXA4821"], 2))


class Lcd(unittest.TestCase):
    def test_sin_acentos_ni_separador(self):
        self.assertEqual(lcd_text("Daniela Ortega Ramírez"), "Daniela Ortega R")
        self.assertEqual(lcd_text("Sí;no"), "Sino")


if __name__ == "__main__":
    unittest.main()
