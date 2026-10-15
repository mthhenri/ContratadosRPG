"""GUI-only startup failure even if a Qt dependency cannot be loaded."""
import os
import sys

def launch():
    try:
        from contratados_transcriber.app import main
        return main()
    except Exception:
        if os.name == "nt":
            import ctypes
            ctypes.windll.user32.MessageBoxW(None,
                "Não foi possível iniciar o Contratados Transcriber. Reinstale esta versão a partir do instalador confiável. Seus resultados locais foram preservados.",
                "Contratados Transcriber", 0x10)
        return 1

if __name__ == "__main__": sys.exit(launch())
