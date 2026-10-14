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
if __name__ == '__main__': unittest.main()
