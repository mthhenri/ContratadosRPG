#define AppVersion "0.3.0"
[Setup]
AppId={{A36EC069-23E1-4BFE-875C-882BD0A3B146}
AppName=Contratados Transcriber
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\ContratadosTranscriber
DefaultGroupName=Contratados Transcriber
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=ContratadosTranscriber-{#AppVersion}-Windows-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
UninstallDisplayIcon={app}\ContratadosTranscriber.exe
[Languages]
Name: "portuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
[Files]
Source: "..\dist\ContratadosTranscriber\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\Contratados Transcriber"; Filename: "{app}\ContratadosTranscriber.exe"
[Registry]
Root: HKCU; Subkey: "Software\Classes\contratados-transcriber"; ValueType: string; ValueName: ""; ValueData: "URL:Contratados Transcriber"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\contratados-transcriber"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\contratados-transcriber\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\ContratadosTranscriber.exe"" ""%1"""
[Run]
Filename: "{app}\ContratadosTranscriber.exe"; Description: "Abrir Contratados Transcriber"; Flags: nowait postinstall skipifsilent
; Never remove LOCALAPPDATA\Contratados\Transcriber: pending results are user data.
