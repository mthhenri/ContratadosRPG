# Run on Windows x64 only, from desktop/transcriber.
from pathlib import Path
root = Path(SPECPATH).parent
licencas = root / "licencas"
if not any(licencas.glob("*.txt")):
    raise SystemExit("Pasta licencas/ vazia ou ausente: os textos de licença precisam ir no bundle (ver licencas/LEIA-ME.md).")
analysis = Analysis([str(root / "launcher.py")], pathex=[str(root / "src")],
    datas=[(str(root / "THIRD-PARTY-NOTICES.md"), "."), (str(licencas), "licencas")],
    binaries=[], hiddenimports=[], hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=[], noarchive=False)
pyz = PYZ(analysis.pure)
exe = EXE(pyz, analysis.scripts, [], exclude_binaries=True, name="ContratadosTranscriber",
    debug=False, bootloader_ignore_signals=False, strip=False, upx=False, console=False)
collection = COLLECT(exe, analysis.binaries, analysis.datas, strip=False, upx=False, name="ContratadosTranscriber")
