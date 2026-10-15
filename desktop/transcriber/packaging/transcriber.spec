# Run on Windows x64 only, from desktop/transcriber.
from pathlib import Path
root = Path(SPECPATH).parent
analysis = Analysis([str(root / "launcher.py")], pathex=[str(root / "src")],
    datas=[(str(root / "THIRD-PARTY-NOTICES.md"), ".")],
    binaries=[], hiddenimports=[], hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=[], noarchive=False)
pyz = PYZ(analysis.pure)
exe = EXE(pyz, analysis.scripts, [], exclude_binaries=True, name="ContratadosTranscriber",
    debug=False, bootloader_ignore_signals=False, strip=False, upx=False, console=False)
collection = COLLECT(exe, analysis.binaries, analysis.datas, strip=False, upx=False, name="ContratadosTranscriber")
