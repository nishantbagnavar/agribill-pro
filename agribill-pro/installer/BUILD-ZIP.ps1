#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

Add-Type -AssemblyName System.IO.Compression.FileSystem

# --- Configuration -----------------------------------------------------------
$VERSION    = "1.0.0"
$SCRIPT_DIR = $PSScriptRoot
$APP_DIR    = Split-Path $SCRIPT_DIR -Parent
$ASSETS     = Join-Path $SCRIPT_DIR "assets"
$OUT_DIR    = Join-Path $SCRIPT_DIR "output"
$PKG_NAME   = "AgriBillPro-v$VERSION-Windows"
$PKG        = Join-Path $OUT_DIR $PKG_NAME
$ZIP        = "$PKG.zip"

# --- Helpers -----------------------------------------------------------------
function Write-Step($n, $msg) {
    Write-Host ""
    Write-Host "[$n/12] $msg" -ForegroundColor Cyan
}
function Write-OK($msg)   { Write-Host "        OK  $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "            $msg" -ForegroundColor Gray }
function Abort($msg) {
    Write-Host ""
    Write-Host "  [ERROR] $msg" -ForegroundColor Red
    Write-Host ""
    Read-Host -Prompt "Press Enter to exit"
    exit 1
}

Clear-Host
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Yellow
Write-Host "    AgriBill Pro  -  Build Distributable ZIP Package"           -ForegroundColor Yellow
Write-Host "    Version: $VERSION"                                           -ForegroundColor Yellow
Write-Host "  ============================================================" -ForegroundColor Yellow


# --- STEP 0: Prerequisites ---------------------------------------------------
Write-Step 0 "Checking prerequisites..."

$nodeCmdObj = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmdObj) { Abort "Node.js not found in PATH. Install from https://nodejs.org" }
$NODE_EXE = $nodeCmdObj.Source

$npmCmdObj = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmdObj) { Abort "npm not found. Reinstall Node.js." }

$nodeVer   = & node --version 2>$null
$nodeMajor = [int]($nodeVer -replace 'v(\d+)\..*', '$1')
if ($nodeMajor -lt 20) { Abort "Node.js $nodeVer is too old. Need v20+." }
Write-OK "Node.js $nodeVer  ->  $NODE_EXE"

foreach ($rel in @("nssm\nssm.exe", "icon.ico", "env.production")) {
    $full = Join-Path $ASSETS $rel
    if (-not (Test-Path $full)) { Abort "Missing required asset: $full" }
}

$envContent = Get-Content (Join-Path $ASSETS "env.production") -Raw
if ($envContent -match "YOUR_GITHUB_USERNAME") {
    Abort "env.production still has placeholder 'YOUR_GITHUB_USERNAME'. Edit it first."
}
Write-OK "All assets present and valid."

$nssmPath = Join-Path $ASSETS "nssm\nssm.exe"
$nssmTest = & "$nssmPath" version 2>&1
if ($LASTEXITCODE -ne 0 -and (-not ($nssmTest -match "NSSM"))) {
    Write-Info "nssm version check: $nssmTest"
}
Write-OK "nssm.exe found."

$rootEnv = Join-Path $APP_DIR ".env"
if (-not (Test-Path $rootEnv)) {
    Abort "No .env file found at $rootEnv. Copy .env.example and fill in values."
}
Write-OK ".env file found."


# --- STEP 1: Kill running Node processes -------------------------------------
Write-Step 1 "Stopping any running Node.js processes..."

$saved = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& taskkill /F /IM node.exe /T 2>$null | Out-Null
$ErrorActionPreference = $saved
Start-Sleep -Seconds 2
Write-OK "Done."


# --- STEP 2: Clean output directory ------------------------------------------
Write-Step 2 "Cleaning old build output..."

if (-not (Test-Path $OUT_DIR)) { New-Item -ItemType Directory -Path $OUT_DIR | Out-Null }
if (Test-Path $ZIP) { Remove-Item -Force $ZIP }

# Use robocopy /MIR to wipe the package folder - handles long paths that
# Remove-Item silently skips, which would leave stale nested folders in the ZIP.
if (Test-Path $PKG) {
    Write-Info "Wiping old package folder (robocopy)..."
    $emptyDir = "$env:TEMP\agribill_empty"
    New-Item -ItemType Directory -Force -Path $emptyDir | Out-Null
    & robocopy $emptyDir $PKG /MIR /R:0 /W:0 /NFL /NDL /NJH /NJS | Out-Null
    Remove-Item -Recurse -Force $PKG -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $emptyDir -ErrorAction SilentlyContinue
}
Write-OK "Output directory is clean."


# --- STEP 3: Build frontend --------------------------------------------------
Write-Step 3 "Building frontend (React + Vite)..."

Push-Location $APP_DIR
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { Abort "Frontend build failed. Check Vite errors above." }
} finally {
    Pop-Location
}

$publicIndex = Join-Path $APP_DIR "backend\public\index.html"
if (-not (Test-Path $publicIndex)) {
    Abort "Frontend build succeeded but backend\public\index.html not found."
}
Write-OK "Frontend built to backend\public\"


# --- STEP 4: Install backend production dependencies -------------------------
Write-Step 4 "Installing backend production dependencies..."

Push-Location (Join-Path $APP_DIR "backend")
try {
    $env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "1"
    $env:PUPPETEER_SKIP_DOWNLOAD          = "1"
    & npm install --omit=dev --prefer-offline
    if ($LASTEXITCODE -ne 0) { Abort "npm install failed. Check errors above." }
} finally {
    Remove-Item Env:\PUPPETEER_SKIP_CHROMIUM_DOWNLOAD -ErrorAction SilentlyContinue
    Remove-Item Env:\PUPPETEER_SKIP_DOWNLOAD          -ErrorAction SilentlyContinue
    Pop-Location
}
Write-OK "Production dependencies installed."


# --- STEP 5: Copy system node.exe to assets ----------------------------------
Write-Step 5 "Copying system node.exe to installer assets..."

$assetsNodeDir = Join-Path $ASSETS "node"
if (-not (Test-Path $assetsNodeDir)) {
    New-Item -ItemType Directory -Path $assetsNodeDir | Out-Null
}
$destNodeExe = Join-Path $assetsNodeDir "node.exe"
Copy-Item -Path $NODE_EXE -Destination $destNodeExe -Force

$copiedVer = & "$destNodeExe" --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Abort "Copied node.exe failed to run. Check source binary at $NODE_EXE"
}
Write-OK "node.exe $copiedVer copied and verified."


# --- STEP 6: Create package folder structure ---------------------------------
Write-Step 6 "Creating package folder structure..."

foreach ($d in @(
    $PKG,
    "$PKG\backend",
    "$PKG\runtime\node",
    "$PKG\nssm",
    "$PKG\data",
    "$PKG\uploads"
)) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}
Write-OK "Folders created."


# --- STEP 7: Copy application files ------------------------------------------
Write-Step 7 "Copying application files (this may take 1-2 minutes)..."

Write-Info "Copying backend/src ..."
Copy-Item -Recurse -Force (Join-Path $APP_DIR "backend\src")          "$PKG\backend\src"

Write-Info "Copying backend/public (built frontend) ..."
Copy-Item -Recurse -Force (Join-Path $APP_DIR "backend\public")       "$PKG\backend\public"

Write-Info "Copying node_modules (production only, skipping .map and .d.ts files) ..."
& robocopy (Join-Path $APP_DIR "backend\node_modules") "$PKG\backend\node_modules" `
    /E /256 /R:0 /W:0 /NFL /NDL /NJH /NJS `
    /XF "*.map" "*.d.ts" "*.d.ts.map" | Out-Null

Copy-Item (Join-Path $APP_DIR "backend\package.json")  "$PKG\backend\package.json"
Copy-Item (Join-Path $ASSETS  "node\node.exe")         "$PKG\runtime\node\node.exe"
Copy-Item (Join-Path $ASSETS  "nssm\nssm.exe")         "$PKG\nssm\nssm.exe"
Copy-Item (Join-Path $ASSETS  "icon.ico")              "$PKG\icon.ico"
Copy-Item (Join-Path $ASSETS  "env.production")        "$PKG\.env"
Copy-Item (Join-Path $APP_DIR "package.json")          "$PKG\package.json"
Copy-Item (Join-Path $APP_DIR "update-manifest.json")  "$PKG\update-manifest.json"

foreach ($p in @(
    "$PKG\backend\node_modules\puppeteer\.local-chromium",
    "$PKG\backend\node_modules\puppeteer\.cache",
    "$PKG\backend\node_modules\puppeteer-core\.local-chromium",
    "$PKG\backend\node_modules\puppeteer-core\.cache",
    "$PKG\backend\node_modules\.cache"
)) {
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
}

# Wipe ALL nested node_modules directories (packages inside packages).
# These cause path lengths > 260 chars when extracted on Windows without
# long-path support enabled. npm v7+ hoists these, so they're not needed.
Write-Info "Wiping nested node_modules directories (long-path safe)..."
$emptyDir2 = "$env:TEMP\agribill_empty2"
New-Item -ItemType Directory -Force -Path $emptyDir2 | Out-Null
$nestedNodeModules = Get-ChildItem -Path "$PKG\backend\node_modules" -Filter "node_modules" `
    -Recurse -Directory -Depth 4 -ErrorAction SilentlyContinue
foreach ($nm in $nestedNodeModules) {
    & robocopy $emptyDir2 $nm.FullName /MIR /R:0 /W:0 /NFL /NDL /NJH /NJS | Out-Null
    Remove-Item -Recurse -Force $nm.FullName -ErrorAction SilentlyContinue
}
Remove-Item -Recurse -Force $emptyDir2 -ErrorAction SilentlyContinue

Write-OK "All files copied."


# --- STEP 8: Write launcher batch files (ASCII encoded) ----------------------
Write-Step 8 "Writing launcher batch files..."

# KEY FIX: Use 'net session' admin check + PowerShell Start-Process -Verb RunAs
# with %~f0 (full path, no 8.3 conversion). The old VBScript %~s0 trick breaks
# on Windows 11 where 8.3 name generation is disabled by default.

$installBat = '@echo off' + "`r`n" +
'setlocal enabledelayedexpansion' + "`r`n" +
'' + "`r`n" +
'net session >nul 2>&1' + "`r`n" +
'if %errorlevel% neq 0 (' + "`r`n" +
'    powershell -NoProfile -Command "Start-Process -FilePath ''%~f0'' -Verb RunAs"' + "`r`n" +
'    exit /b' + "`r`n" +
')' + "`r`n" +
'' + "`r`n" +
'cd /d "%~dp0"' + "`r`n" +
'set "NODE=%~dp0runtime\node\node.exe"' + "`r`n" +
'set "NSSM=%~dp0nssm\nssm.exe"' + "`r`n" +
'set "SVC=AgriBillPro"' + "`r`n" +
'set "LOGS=%LOCALAPPDATA%\AgriBillPro\logs"' + "`r`n" +
'' + "`r`n" +
'set "APPDIR=%~dp0"' + "`r`n" +
'if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"' + "`r`n" +
'' + "`r`n" +
'if not exist "%LOGS%" mkdir "%LOGS%"' + "`r`n" +
'' + "`r`n" +
'netstat -an 2>nul | find ":5000 " >nul' + "`r`n" +
'if %errorlevel%==0 (' + "`r`n" +
'    start "" "http://localhost:5000"' + "`r`n" +
'    exit /b 0' + "`r`n" +
')' + "`r`n" +
'' + "`r`n" +
'echo.' + "`r`n" +
'echo  ============================================' + "`r`n" +
'echo    AgriBill Pro  -  Setup' + "`r`n" +
'echo  ============================================' + "`r`n" +
'echo.' + "`r`n" +
'' + "`r`n" +
'echo  [1/4] Running database migration...' + "`r`n" +
'"%NODE%" "%APPDIR%\backend\src\db\migrate.js"' + "`r`n" +
'if %errorlevel% neq 0 echo        Warning: migration returned error (OK on upgrade)' + "`r`n" +
'' + "`r`n" +
'echo  [2/4] Checking Windows service...' + "`r`n" +
'sc query %SVC% >nul 2>&1' + "`r`n" +
'if %errorlevel%==0 (' + "`r`n" +
'    sc qc %SVC% | findstr /i "%APPDIR%" >nul 2>&1' + "`r`n" +
'    if %errorlevel% neq 0 (' + "`r`n" +
'        echo         Reinstalling service at new path...' + "`r`n" +
'        "%NSSM%" stop %SVC% 2>nul' + "`r`n" +
'        "%NSSM%" remove %SVC% confirm 2>nul' + "`r`n" +
'        timeout /t 2 /nobreak >nul' + "`r`n" +
'    )' + "`r`n" +
')' + "`r`n" +
'' + "`r`n" +
'sc query %SVC% >nul 2>&1' + "`r`n" +
'if %errorlevel% neq 0 (' + "`r`n" +
'    echo  [3/4] Installing Windows service...' + "`r`n" +
'    "%NSSM%" install %SVC% "%APPDIR%\runtime\node\node.exe" "%APPDIR%\backend\src\index.js"' + "`r`n" +
'    "%NSSM%" set %SVC% AppDirectory "%APPDIR%"' + "`r`n" +
'    "%NSSM%" set %SVC% AppEnvironmentExtra "NODE_ENV=production" "PORT=5000"' + "`r`n" +
'    "%NSSM%" set %SVC% AppStdout "%LOGS%\app.log"' + "`r`n" +
'    "%NSSM%" set %SVC% AppStderr "%LOGS%\error.log"' + "`r`n" +
'    "%NSSM%" set %SVC% Start SERVICE_AUTO_START' + "`r`n" +
') else (' + "`r`n" +
'    echo  [3/4] Service already configured.' + "`r`n" +
')' + "`r`n" +
'' + "`r`n" +
'echo  [4/4] Starting service...' + "`r`n" +
'"%NSSM%" start %SVC% 2>nul' + "`r`n" +
'' + "`r`n" +
'echo.' + "`r`n" +
'echo  Waiting for server to start (up to 45 seconds)...' + "`r`n" +
'set /a COUNT=0' + "`r`n" +
':WAIT' + "`r`n" +
'timeout /t 1 /nobreak >nul' + "`r`n" +
'netstat -an 2>nul | find ":5000 " >nul' + "`r`n" +
'if %errorlevel%==0 goto :OPEN' + "`r`n" +
'set /a COUNT+=1' + "`r`n" +
'if %COUNT% lss 45 goto :WAIT' + "`r`n" +
'' + "`r`n" +
'echo.' + "`r`n" +
'echo  [ERROR] Server did not start within 45 seconds.' + "`r`n" +
'echo  Check logs at: %LOGS%\error.log' + "`r`n" +
'echo.' + "`r`n" +
'pause' + "`r`n" +
'exit /b 1' + "`r`n" +
'' + "`r`n" +
':OPEN' + "`r`n" +
'echo.' + "`r`n" +
'echo  AgriBill Pro is ready!  Opening in your browser...' + "`r`n" +
'echo.' + "`r`n" +
'start "" "http://localhost:5000"'

$openBat = '@echo off' + "`r`n" +
'netstat -an 2>nul | find ":5000 " >nul' + "`r`n" +
'if %errorlevel%==0 (' + "`r`n" +
'    start "" "http://localhost:5000"' + "`r`n" +
') else (' + "`r`n" +
'    echo.' + "`r`n" +
'    echo  AgriBill Pro is not running.' + "`r`n" +
'    echo  Run "AgriBill Pro - Install.bat" to start it.' + "`r`n" +
'    echo.' + "`r`n" +
'    pause' + "`r`n" +
')'

$stopBat = '@echo off' + "`r`n" +
'net session >nul 2>&1' + "`r`n" +
'if %errorlevel% neq 0 (' + "`r`n" +
'    powershell -NoProfile -Command "Start-Process -FilePath ''%~f0'' -Verb RunAs"' + "`r`n" +
'    exit /b' + "`r`n" +
')' + "`r`n" +
'echo Stopping AgriBill Pro...' + "`r`n" +
'"%~dp0nssm\nssm.exe" stop AgriBillPro' + "`r`n" +
'echo Done.' + "`r`n" +
'pause'

$uninstallBat = '@echo off' + "`r`n" +
'net session >nul 2>&1' + "`r`n" +
'if %errorlevel% neq 0 (' + "`r`n" +
'    powershell -NoProfile -Command "Start-Process -FilePath ''%~f0'' -Verb RunAs"' + "`r`n" +
'    exit /b' + "`r`n" +
')' + "`r`n" +
'echo Stopping AgriBill Pro service...' + "`r`n" +
'"%~dp0nssm\nssm.exe" stop AgriBillPro 2>nul' + "`r`n" +
'echo Removing Windows service...' + "`r`n" +
'"%~dp0nssm\nssm.exe" remove AgriBillPro confirm' + "`r`n" +
'echo.' + "`r`n" +
'echo  Service removed. Your data is at: %~dp0data\' + "`r`n" +
'echo.' + "`r`n" +
'pause'

[System.IO.File]::WriteAllText("$PKG\AgriBill Pro - Install.bat", $installBat,   [System.Text.Encoding]::ASCII)
[System.IO.File]::WriteAllText("$PKG\Open AgriBill Pro.bat",      $openBat,      [System.Text.Encoding]::ASCII)
[System.IO.File]::WriteAllText("$PKG\Stop AgriBill Pro.bat",      $stopBat,      [System.Text.Encoding]::ASCII)
[System.IO.File]::WriteAllText("$PKG\Uninstall AgriBill Pro.bat", $uninstallBat, [System.Text.Encoding]::ASCII)
Write-OK "4 launcher scripts written (ASCII encoded)."


# --- STEP 9: Write README.txt ------------------------------------------------
Write-Step 9 "Writing README.txt..."

$readmeLines = @(
    "AgriBill Pro - Billing & Inventory Management",
    "==============================================",
    "",
    "FIRST TIME SETUP",
    "----------------",
    "1. Extract this ZIP to any folder  (e.g. C:\AgriBillPro\)",
    "2. Double-click:  AgriBill Pro - Install.bat",
    "3. Click YES on the admin (UAC) prompt",
    "4. Wait up to 45 seconds",
    "5. Your browser opens at http://localhost:5000",
    "6. Register your shop and start billing!",
    "",
    "DAILY USE",
    "---------",
    "The app runs as a Windows service and starts with Windows.",
    "Visit: http://localhost:5000",
    "Or double-click: Open AgriBill Pro.bat",
    "",
    "STOP THE APP",
    "------------",
    "Double-click: Stop AgriBill Pro.bat",
    "",
    "UNINSTALL",
    "---------",
    "Double-click: Uninstall AgriBill Pro.bat",
    "Note: Your database stays at  <this folder>\data\agribill.db",
    "",
    "UPGRADING",
    "---------",
    "1. Uninstall old version",
    "2. Extract new ZIP to a new folder",
    "3. Copy your data\agribill.db from old folder to new folder",
    "4. Run AgriBill Pro - Install.bat in the new folder",
    "",
    "LOGS",
    "----",
    "%LOCALAPPDATA%\AgriBillPro\logs\app.log",
    "%LOCALAPPDATA%\AgriBillPro\logs\error.log",
    "",
    "SUPPORT",
    "-------",
    "Email: bagnavarnishant@gmail.com"
)
$readmeText = $readmeLines -join "`r`n"
[System.IO.File]::WriteAllText("$PKG\README.txt", $readmeText, [System.Text.Encoding]::UTF8)
Write-OK "README.txt written."


# --- STEP 10: Pre-flight server test (30 seconds) ----------------------------
Write-Step 10 "Running pre-flight server test (up to 30 seconds)..."

$nodeInPkg   = "$PKG\runtime\node\node.exe"
$serverEntry = "$PKG\backend\src\index.js"

# Start node directly - no cmd.exe wrapper (avoids quoting issues),
# no output capture (avoids PS5.1 Start-Process buffering bug).
# We verify success by polling port 5000 instead.
$proc = Start-Process -FilePath $nodeInPkg `
                      -ArgumentList "`"$serverEntry`"" `
                      -WorkingDirectory $PKG `
                      -PassThru `
                      -WindowStyle Hidden

Write-Info "Server starting (PID $($proc.Id)) - polling port 5000 for up to 30s..."

$started  = $false
$deadline = (Get-Date).AddSeconds(30)

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
    $portActive = (& netstat -an 2>$null) | Select-String ":5000 "
    if ($portActive) { $started = $true; break }
}

$saved2 = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& taskkill /F /PID $proc.Id /T 2>$null | Out-Null
$ErrorActionPreference = $saved2
Start-Sleep -Seconds 2

$testDb = "$PKG\data\agribill.db"
foreach ($ext in @("", "-shm", "-wal")) {
    if (Test-Path "${testDb}${ext}") { Remove-Item "${testDb}${ext}" -Force }
}

if (-not $started) {
    Write-Host ""
    Write-Host "  Pre-flight could not reach port 5000. Debug manually:" -ForegroundColor Red
    Write-Host "    cd $PKG" -ForegroundColor Yellow
    Write-Host "    .\runtime\node\node.exe backend\src\index.js" -ForegroundColor Yellow
    Write-Host ""
    Abort "Pre-flight FAILED: server did not bind to port 5000 within 30 seconds."
}

Write-OK "Pre-flight PASSED - server bound to port 5000 successfully."


# --- STEP 11: Create ZIP archive ---------------------------------------------
Write-Step 11 "Creating ZIP archive (may take 1-2 minutes)..."
Write-Info "Compressing $PKG_NAME ..."

[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $PKG,
    $ZIP,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $true
)

if (-not (Test-Path $ZIP)) {
    Abort "ZIP was not created. Check disk space and permissions."
}
$zipSizeMB = [math]::Round((Get-Item $ZIP).Length / 1MB, 1)
Write-OK "ZIP created: $zipSizeMB MB"


# --- STEP 12: Verify ZIP contents --------------------------------------------
Write-Step 12 "Verifying ZIP contents..."

$archive    = [System.IO.Compression.ZipFile]::OpenRead($ZIP)
$entries    = $archive.Entries | ForEach-Object { $_.FullName.Replace("\", "/") }
$entryCount = $entries.Count
$archive.Dispose()

$required = @(
    "AgriBill Pro - Install.bat",
    "Open AgriBill Pro.bat",
    "Stop AgriBill Pro.bat",
    "Uninstall AgriBill Pro.bat",
    "README.txt",
    ".env",
    "package.json",
    "update-manifest.json",
    "icon.ico",
    "runtime/node/node.exe",
    "nssm/nssm.exe",
    "backend/src/index.js",
    "backend/public/index.html"
)

$missing = @()
foreach ($r in $required) {
    $leaf = $r.Split("/")[-1]
    $found = $entries | Where-Object { $_ -like "*/$leaf" -or $_ -eq $leaf }
    if (-not $found) {
        $missing += $r
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "  Missing from ZIP:" -ForegroundColor Red
    foreach ($m in $missing) {
        Write-Host "    - $m" -ForegroundColor Red
    }
    Abort "ZIP verification failed - required files are missing."
}

Write-OK "$entryCount files verified in ZIP."


# --- Done! -------------------------------------------------------------------
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "    SUCCESS!" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "    File  :  installer\output\$PKG_NAME.zip" -ForegroundColor White
Write-Host "    Size  :  $zipSizeMB MB"                  -ForegroundColor White
Write-Host ""
Write-Host "  Next step: follow Manual Test Protocol in BUILD-ZIP.md" -ForegroundColor White
Write-Host "    1. Extract ZIP to C:\Temp\AgriBillPro\"               -ForegroundColor White
Write-Host "    2. Double-click  AgriBill Pro - Install.bat"          -ForegroundColor White
Write-Host "    3. Click YES on the UAC prompt"                        -ForegroundColor White
Write-Host "    4. Browser opens automatically"                        -ForegroundColor White
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""

Invoke-Item $OUT_DIR

Read-Host -Prompt "Press Enter to exit"
