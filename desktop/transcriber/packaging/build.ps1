$ErrorActionPreference = "Stop"
if (-not [Environment]::Is64BitOperatingSystem) { throw "Windows x64 necessário." }
Set-Location (Join-Path $PSScriptRoot "..")
python -c "import struct,sys; assert struct.calcsize('P') == 8 and sys.version_info[:2] == (3,12), 'Build requer Python 3.12 x64'"
if ($LASTEXITCODE -ne 0) { throw "Build requer Python 3.12 x64." }
python -m unittest discover -s tests
if ($LASTEXITCODE -ne 0) { throw "Testes falharam." }
python -m PyInstaller --clean --noconfirm packaging/transcriber.spec
if ($LASTEXITCODE -ne 0) { throw "Empacotamento falhou." }
$compiler = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6/ISCC.exe"
if (-not (Test-Path $compiler)) { throw "Inno Setup 6 necessário na máquina de build." }
& $compiler packaging/installer.iss
if ($LASTEXITCODE -ne 0) { throw "Instalador falhou." }
Get-ChildItem dist/*Windows-x64.exe | ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
    "$hash  $($_.Name)" | Set-Content ($_.FullName + ".sha256") -Encoding ascii
}
