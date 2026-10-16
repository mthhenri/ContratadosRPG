# Roda DENTRO do Windows Sandbox (Windows limpo e descartavel). Pastas mapeadas pelo .wsb:
#   C:\Instalador  (somente leitura) = desktop\transcriber\dist do host
#   C:\Evidencias  (leitura e escrita) = pasta de evidencias do host
# Fase 1 (automatica no logon): registra o ambiente e deixa o instalador na Area de Trabalho com a marca de
#   "baixado da internet" (Mark-of-the-Web), para o SmartScreen agir como agiria com um download real.
# Fase 2 (duplo clique depois de INSTALAR a mao): confere instalacao, protocolo, atalho e abre o app (I1, I2, I3).
# Fase 3 (duplo clique): quebra um modulo numa COPIA da instalacao e abre para ver a mensagem de falha (I4).
param([int]$Fase = 1)
$ErrorActionPreference = "Continue"
$ev = "C:\Evidencias"; $desktop = [Environment]::GetFolderPath("Desktop")
$instalacao = Join-Path $env:LOCALAPPDATA "Programs\ContratadosTranscriber"
function Registrar($t) { $t | Tee-Object -FilePath (Join-Path $ev "sandbox-fase$Fase.txt") -Append }
function Capturar($nome) {
    Add-Type -AssemblyName System.Drawing, System.Windows.Forms
    $tela = [Windows.Forms.Screen]::PrimaryScreen.Bounds
    $b = New-Object Drawing.Bitmap $tela.Width, $tela.Height
    [Drawing.Graphics]::FromImage($b).CopyFromScreen($tela.Location, [Drawing.Point]::Empty, $tela.Size)
    $b.Save((Join-Path $ev "$nome.png"))
}
Registrar "=== Fase $Fase em $(Get-Date -Format s) ==="
if ($Fase -eq 1) {
    Registrar "Windows: $((Get-CimInstance Win32_OperatingSystem).Caption) $((Get-CimInstance Win32_OperatingSystem).Version)"
    Registrar "Usuario: $env:USERNAME (administrador: $(([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole('Administrator')))"
    foreach ($c in "python", "py", "pip", "git") { Registrar ("{0,-7} no PATH: {1}" -f $c, [bool](Get-Command $c -ErrorAction SilentlyContinue)) }
    Registrar "Pasta Programs do usuario antes: existe ContratadosTranscriber = $(Test-Path $instalacao)"
    $exe = Get-ChildItem "C:\Instalador\ContratadosTranscriber-*-Windows-x64.exe" | Select-Object -First 1
    $copia = Join-Path $desktop $exe.Name
    Copy-Item $exe.FullName $copia
    Set-Content -Path $copia -Stream Zone.Identifier -Value "[ZoneTransfer]`r`nZoneId=3"
    Registrar "Instalador na Area de Trabalho com Mark-of-the-Web: $copia"
    Registrar ("SHA-256 da copia: " + (Get-FileHash $copia -Algorithm SHA256).Hash.ToLower())
    Registrar ("Assinatura: " + (Get-AuthenticodeSignature $copia).Status)
    Set-Content (Join-Path $desktop "Fase 2 - depois de instalar.cmd") 'powershell -ExecutionPolicy Bypass -File C:\Roteiro\verificar-no-sandbox.ps1 -Fase 2' -Encoding ascii
    Set-Content (Join-Path $desktop "Fase 3 - falha de startup (I4).cmd") 'powershell -ExecutionPolicy Bypass -File C:\Roteiro\verificar-no-sandbox.ps1 -Fase 3' -Encoding ascii
    Capturar "sandbox-i1-antes"
    Registrar "PRONTO. Agora: de duplo clique no instalador da Area de Trabalho (I1/I3). Anote se o SmartScreen apareceu e o que ele disse."
}
if ($Fase -eq 2) {
    Registrar "Instalacao existe: $(Test-Path (Join-Path $instalacao 'ContratadosTranscriber.exe'))"
    Registrar ("Protocolo (HKCU): " + ((reg query HKCU\Software\Classes\contratados-transcriber\shell\open\command) -join " "))
    Registrar ("Atalho no Menu Iniciar: " + ((Get-ChildItem "$env:APPDATA\Microsoft\Windows\Start Menu\Programs" -Recurse -Filter *.lnk | Where-Object Name -match "Contratados" | ForEach-Object FullName) -join "; "))
    Registrar ("Python no PATH apos instalar: " + [bool](Get-Command python -ErrorAction SilentlyContinue))
    $licencas = Get-ChildItem (Join-Path $instalacao "_internal\licencas") -ErrorAction SilentlyContinue
    foreach ($l in $licencas) { Registrar ("{0}  {1}" -f $l.Name, (Get-FileHash $l.FullName -Algorithm SHA256).Hash.ToLower()) }
    $p = Start-Process (Join-Path $instalacao "ContratadosTranscriber.exe") -PassThru; Start-Sleep 8
    Registrar "App aberto: $(-not $p.HasExited) | titulo: '$((Get-Process -Id $p.Id -ErrorAction SilentlyContinue).MainWindowTitle)'"
    Capturar "sandbox-i3-app-aberto"
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}
if ($Fase -eq 3) {
    $copia = Join-Path $env:TEMP "copia-i4"; Remove-Item $copia -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item $instalacao $copia -Recurse
    foreach ($m in "QtWidgets.pyd", "Qt6Widgets.dll") {
        Get-ChildItem $copia -Recurse -Filter $m | ForEach-Object { Rename-Item $_.FullName ($_.Name + ".bak"); Registrar "Renomeado: $($_.Name)" }
    }
    $p = Start-Process (Join-Path $copia "ContratadosTranscriber.exe") -PassThru; Start-Sleep 8
    $p.Refresh(); Registrar "Processo vivo: $(-not $p.HasExited) | janela: '$($p.MainWindowTitle)'"
    Capturar "sandbox-i4-falha-startup"
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}
