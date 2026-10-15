import importlib.util
import unittest
from unittest.mock import patch
import time
@unittest.skipUnless(importlib.util.find_spec("PySide6"), "PySide6 precisa estar instalado")
class QtTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])
    def test_opaque_uri_resolves_and_renders_private_title_as_plaintext(self):
        from contratados_transcriber.app import Window
        from PySide6.QtCore import Qt
        class Session:
            def refresh(self): pass
            def resolve(self, intent): return {"titulo": "<b>Sessão</b>", "campanhaId": 2}
        window = Window()
        with patch.object(window, "configure", return_value=Session()):
            window.open_uri("contratados-transcriber://abrir/e809de1e-005c-4943-9c68-5ce3b445065e")
            until = time.monotonic() + 3
            while window.busy and time.monotonic() < until:
                self.app.processEvents(); time.sleep(.01)
        self.assertFalse(window.busy)
        self.assertIn("<b>Sessão</b>", window.context.text())
        self.assertEqual(window.context.textFormat(), Qt.TextFormat.PlainText)
        window.close()
    def test_malformed_uri_does_not_configure_or_access_api(self):
        from contratados_transcriber.app import Window
        window = Window()
        with patch.object(window, "configure") as configure:
            window.open_uri("contratados-transcriber://abrir/x?token=secret")
            configure.assert_not_called()
            self.assertIn("inválida", window.status.text())
        window.close()
    def test_rejected_open_clears_the_previous_session_label(self):
        # P-128: abertura recusada (uso único, prazo, permissão) não pode deixar a sessão anterior na tela.
        from contratados_transcriber.app import Window
        class Session:
            def __init__(self): self.calls = 0
            def refresh(self): pass
            def resolve(self, intent):
                self.calls += 1
                if self.calls > 1: raise ValueError("Abertura indisponível: prazo, conta ou permissão de Mestre.")
                return {"titulo": "Sessão A", "campanhaId": 1}
        window, session = Window(), Session()
        uri = "contratados-transcriber://abrir/e809de1e-005c-4943-9c68-5ce3b445065e"
        with patch.object(window, "configure", return_value=session):
            for _ in range(2):
                window.open_uri(uri)
                until = time.monotonic() + 3
                while window.busy and time.monotonic() < until:
                    self.app.processEvents(); time.sleep(.01)
        self.assertIn("indisponível", window.status.text())
        self.assertEqual(window.context.text(), "Nenhuma sessão aberta.")
        window.close()
if __name__ == '__main__': unittest.main()
