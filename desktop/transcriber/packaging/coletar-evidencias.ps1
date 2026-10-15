# Coleta evidências DEPOIS do build/instalação e grava um relatório em Markdown.
# Uso (da pasta desktop/transcriber): ./packaging/coletar-evidencias.ps1
# Só lê e grava o relatório; não instala, não assina, não publica.
# NÃO foi executado em Windows na autoria (sem PowerShell no ambiente Linux): valide na primeira rodada.
$ErrorActionPreference = "Continue"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
$repo = Resolve-Path (Join-Path $raiz "../..")
$destino = Join-Path $repo ".artifacts/transcricoes-03-agente-windows-e-vinculo"
New-Item -ItemType Directory -Force -Path $destino | Out-Null
$arquivo = Join-Path $destino ("evidencias-windows-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".md")
$linhas = New-Object System.Collections.Generic.List[string]
function Adicionar($texto) { $script:linhas.Add($texto) }

Adicionar "# Evidências Windows — task 03"
Adicionar ""
Adicionar "- Data: $(Get-Date -Format s)"
Adicionar "- Sistema: $((Get-CimInstance Win32_OperatingSystem).Caption) $((Get-CimInstance Win32_OperatingSystem).Version)"
Adicionar "- Commit: $(git -C $repo rev-parse HEAD 2>$null)"
Adicionar "- Python: $(python --version 2>&1)"
Adicionar ""

Adicionar "## Instalador"
$instalador = Get-ChildItem (Join-Path $raiz "dist/*Windows-x64.exe") -ErrorAction SilentlyContinue
if (-not $instalador) { Adicionar "Instalador não encontrado em dist/." }
foreach ($item in $instalador) {
    $hash = (Get-FileHash $item.FullName -Algorithm SHA256).Hash.ToLower()
    $assinatura = Get-AuthenticodeSignature $item.FullName
    Adicionar "- Arquivo: $($item.Name) ($([math]::Round($item.Length / 1MB, 1)) MB)"
    Adicionar "- SHA-256: $hash"
    Adicionar "- Assinatura Authenticode: $($assinatura.Status) — $($assinatura.StatusMessage)"
}
Adicionar ""

Adicionar "## Instalação por usuário"
$destinoInstalacao = Join-Path $env:LOCALAPPDATA "Programs/ContratadosTranscriber"
Adicionar "- Pasta esperada: $destinoInstalacao — existe: $(Test-Path $destinoInstalacao)"
$exe = Join-Path $destinoInstalacao "ContratadosTranscriber.exe"
if (Test-Path $exe) {
    Adicionar "- Executável: SHA-256 $((Get-FileHash $exe -Algorithm SHA256).Hash.ToLower()), assinatura: $((Get-AuthenticodeSignature $exe).Status)"
    $tamanho = (Get-ChildItem $destinoInstalacao -Recurse -File | Measure-Object Length -Sum).Sum
    Adicionar "- Tamanho instalado: $([math]::Round($tamanho / 1MB, 1)) MB"
}
$comando = Get-ItemProperty "HKCU:\Software\Classes\contratados-transcriber\shell\open\command" -ErrorAction SilentlyContinue
Adicionar "- Protocolo (HKCU) comando: $(if ($comando) { $comando.'(default)' } else { 'NÃO REGISTRADO' })"
Adicionar "- Dados locais (devem sobreviver à desinstalação): $(Test-Path (Join-Path $env:LOCALAPPDATA 'Contratados/Transcriber'))"
Adicionar ""

Adicionar "## Licenças empacotadas (gate B4)"
$licencas = Get-ChildItem $destinoInstalacao -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "LICEN[SC]E|COPYING|NOTICE|THIRD-PARTY|GPL|LEIA-ME" -and $_.FullName -notmatch "[\/]PySide6[\/]" }
if ($licencas) { foreach ($l in $licencas) { Adicionar "- $($l.FullName.Replace($destinoInstalacao, '.')) — SHA-256 $((Get-FileHash $l.FullName -Algorithm SHA256).Hash.ToLower())" } }
else { Adicionar "- Nenhum arquivo de licença/aviso encontrado na instalação." }
Adicionar ""

Adicionar "## Módulos Qt presentes (o app usa só Core, Gui, Widgets, Network)"
$qt = Get-ChildItem $destinoInstalacao -Recurse -File -Filter "Qt6*.dll" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Sort-Object
Adicionar "- $($qt -join ', ')"

$linhas | Set-Content -Path $arquivo -Encoding utf8
Write-Host "Relatório gravado em $arquivo"
