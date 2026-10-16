# Run on Windows x64 only, from desktop/transcriber.
from pathlib import Path
root = Path(SPECPATH).parent
licencas = root / "licencas"
if not any(licencas.glob("*.txt")):
    raise SystemExit("Pasta licencas/ vazia ou ausente: os textos de licença precisam ir no bundle (ver licencas/LEIA-ME.md).")
# O app usa só Core, Gui, Widgets e Network. Estes módulos do PySide6 entram por tabela e aumentam o tamanho e o que
# precisa ser licenciado; fora do bundle eles não carregam (o launcher mostra a falha nativa se algo faltar).
EXCLUDES = ["PySide6.QtQml", "PySide6.QtQuick", "PySide6.QtQuickWidgets", "PySide6.QtPdf", "PySide6.QtPdfWidgets",
            "PySide6.QtVirtualKeyboard", "PySide6.QtSvg", "PySide6.QtSvgWidgets", "PySide6.QtOpenGL", "PySide6.QtOpenGLWidgets"]
analysis = Analysis([str(root / "launcher.py")], pathex=[str(root / "src")],
    datas=[(str(root / "THIRD-PARTY-NOTICES.md"), "."), (str(licencas), "licencas")],
    binaries=[], hiddenimports=[], hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=EXCLUDES, noarchive=False)
# As DLLs voltam pelos plugins do Qt (teclado virtual, ícones SVG, PDF); sem filtrar aqui elas continuam no bundle.
SEM_BINARIO = ("qt6qml", "qt6quick", "qt6pdf", "qt6virtualkeyboard", "qt6svg", "qt6opengl", "qtvirtualkeyboardplugin", "qsvg", "qpdf")
analysis.binaries = [b for b in analysis.binaries if not any(nome in b[0].lower() for nome in SEM_BINARIO)]
pyz = PYZ(analysis.pure)
exe = EXE(pyz, analysis.scripts, [], exclude_binaries=True, name="ContratadosTranscriber",
    debug=False, bootloader_ignore_signals=False, strip=False, upx=False, console=False)
collection = COLLECT(exe, analysis.binaries, analysis.datas, strip=False, upx=False, name="ContratadosTranscriber")
