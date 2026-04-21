; AgriBill Pro — Inno Setup Installer Script
; Requires: Inno Setup 6.x  https://jrsoftware.org/isinfo.php
; Build:    iscc installer\agribill-pro.iss
;
; Before running:
;   1. npm run build          (builds frontend → backend/public/)
;   2. Place node.exe (node-v20 standalone) in installer\assets\node\
;   3. Place pm2.cmd  in installer\assets\pm2\  (or let postinstall handle it)
;   4. iscc installer\agribill-pro.iss

#define AppName    "AgriBill Pro"
#define AppVersion "1.0.0"
#define AppPublisher "AgriBill Technologies"
#define AppURL     "https://agribillpro.com"
#define AppExeName "agribill-launcher.bat"
#define ServiceName "AgriBillPro"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/support
AppUpdatesURL={#AppURL}/updates
DefaultDirName={autopf}\AgriBillPro
DefaultGroupName={#AppName}
AllowNoIcons=yes
; Require admin so we can register the Windows service
PrivilegesRequired=admin
OutputDir=output
OutputBaseFilename=AgriBillPro-Setup-{#AppVersion}
SetupIconFile=assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; Min Windows version: Windows 10
MinVersion=10.0
UninstallDisplayIcon={app}\icon.ico
UninstallDisplayName={#AppName}
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked
Name: "startupentry"; Description: "Start AgriBill Pro when &Windows starts"; GroupDescription: "Startup:"; Flags: unchecked

[Dirs]
Name: "{app}\data"
Name: "{app}\uploads"
Name: "{localappdata}\AgriBillPro\logs"

[Files]
; ── Application source ──────────────────────────────────────────────────────
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules\*,*.log"
Source: "..\backend\public\*"; DestDir: "{app}\backend\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\update-manifest.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\ecosystem.config.js"; DestDir: "{app}"; Flags: ignoreversion

; ── Bundled Node.js runtime ──────────────────────────────────────────────────
; Download node-v20-win-x64 standalone binary and place in installer\assets\node\
Source: "assets\node\*"; DestDir: "{app}\runtime\node"; Flags: ignoreversion recursesubdirs createallsubdirs

; ── Backend node_modules (pre-installed) ─────────────────────────────────────
; Run `npm install --omit=dev` in backend\ before building the installer
Source: "..\backend\node_modules\*"; DestDir: "{app}\backend\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; ── Default .env (only written if not already present — preserves user config on upgrade) ──
Source: "assets\env.production"; DestDir: "{app}"; DestName: ".env"; Flags: onlyifdoesntexist

; ── Launcher + service scripts ───────────────────────────────────────────────
Source: "assets\agribill-launcher.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\install-service.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\uninstall-service.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\post-install.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\icon.ico"; DestDir: "{app}"; Flags: ignoreversion

; ── nssm (service manager) ──────────────────────────────────────────────────
; nssm.exe wraps node.exe as a Windows service (no external dependency)
Source: "assets\nssm\nssm.exe"; DestDir: "{app}\nssm"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\Open in Browser"; Filename: "http://localhost:5000"; IconFilename: "{app}\icon.ico"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
; Run DB migration + service install/start via wrapper script (always exits 0)
Filename: "{cmd}"; Parameters: "/c ""{app}\post-install.bat"""; WorkingDir: "{app}"; StatusMsg: "Setting up AgriBill Pro service..."; Flags: runhidden waituntilterminated

; Open browser after install
Filename: "http://localhost:5000"; Description: "Open AgriBill Pro in browser"; Flags: postinstall shellexec nowait skipifsilent

[UninstallRun]
Filename: "{app}\nssm\nssm.exe"; Parameters: "stop {#ServiceName}"; Flags: runhidden waituntilterminated
Filename: "{app}\nssm\nssm.exe"; Parameters: "remove {#ServiceName} confirm"; Flags: runhidden waituntilterminated

[Registry]
; Startup entry (optional, controlled by task)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#AppName}"; ValueData: """{app}\{#AppExeName}"""; Flags: uninsdeletevalue; Tasks: startupentry

; App metadata for Windows "Installed apps" list
Root: HKLM; Subkey: "Software\{#AppPublisher}\{#AppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#AppPublisher}\{#AppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#AppVersion}"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
  // Use WizardDirValue() not {app} — {app} is unavailable at this stage
  if DirExists(WizardDirValue()) then
  begin
    if MsgBox('An existing AgriBill Pro installation was found. The installer will upgrade it.'#13#10#13#10'Your data will be preserved. Continue?',
              mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDst: String;
begin
  if CurStep = ssPostInstall then
  begin
    DataDst := ExpandConstant('{localappdata}\AgriBillPro\data');
    if not DirExists(DataDst) then
      ForceDirectories(DataDst);
  end;
end;
