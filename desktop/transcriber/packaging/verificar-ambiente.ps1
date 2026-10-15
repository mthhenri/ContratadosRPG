# Confere a máquina de build ANTES de ./packaging/build.ps1. Só lê; não instala nem altera nada.
# NÃO foi executado em Windows na autoria (sem PowerShell no ambiente Linux): valide na primeira rodada.
$ErrorActionPreference = "Continue"
$falhas = 0
function Resultado($ok, $texto) {
    if ($ok) { Write-Host "[ok]    $texto" } else { Write-Host "[FALHA] $texto"; $script:falhas++ }
}

Resultado ([Environment]::Is64BitOperatingSystem) "Windows x64"
$sistema = (Get-CimInstance Win32_OperatingSystem).Caption + " " + (Get-CimInstance Win32_OperatingSystem).Version
Write-Host "        Sistema: $sistema"

$pythonOk = $false
try {
    $info = python -c "import struct,sys; print(sys.version.split()[0], struct.calcsize('P')*8)" 2>$null
    $partes = "$info".Split(" ")
    $pythonOk = ($partes[0] -like "3.12.*") -and ($partes[1] -eq "64")
    Write-Host "        Python: $info"
} catch { }
Resultado $pythonOk "Python 3.12 x64 no PATH (o build exige exatamente 3.12 de 64 bits)"

$compilador = @("${env:ProgramFiles(x86)}", $env:ProgramFiles, "$env:LOCALAPPDATA\Programs") |
    ForEach-Object { Join-Path $_ "Inno Setup 6/ISCC.exe" } | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $compilador) { $compilador = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6/ISCC.exe" }
$innoOk = Test-Path $compilador
Resultado $innoOk "Inno Setup 6 encontrado em $compilador"
if ($innoOk) {
    # O ISCC.exe reporta 0.0.0.0; a versão real está no unins000.exe da mesma pasta.
    $desinstalador = Join-Path (Split-Path $compilador) "unins000.exe"
    $versao = if (Test-Path $desinstalador) { (Get-Item $desinstalador).VersionInfo.ProductVersion } else { "0.0.0" }
    Write-Host "        Inno Setup: $versao"
    # O instalador usa 'x64compatible', que só existe a partir da 6.3.
    $partes = "$versao".Split(".")
    $minimoOk = ([int]$partes[0] -gt 6) -or (([int]$partes[0] -eq 6) -and ([int]$partes[1] -ge 3))
    Resultado $minimoOk "Inno Setup 6.3 ou superior"
}

Resultado ((Get-Command git -ErrorAction SilentlyContinue) -ne $null) "git no PATH (para registrar o commit do build)"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
Resultado (Test-Path (Join-Path $raiz "requirements-build.txt")) "requirements-build.txt presente em $raiz"
Resultado (Test-Path (Join-Path $raiz "THIRD-PARTY-NOTICES.md")) "THIRD-PARTY-NOTICES.md presente"

$pasta = Join-Path $raiz "licencas"
$temLicencas = (Test-Path $pasta) -and ((Get-ChildItem $pasta -File -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)
Resultado $temLicencas "Pasta licencas/ com os textos de licença a empacotar"

if ($falhas -gt 0) { Write-Host "`n$falhas verificação(ões) falharam. Resolva antes do build."; exit 1 }
Write-Host "`nAmbiente pronto para ./packaging/build.ps1"
