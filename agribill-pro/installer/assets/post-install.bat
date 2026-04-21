@echo off
setlocal
set APP=%~dp0
set APP=%APP:~0,-1%
set NODE=%APP%\runtime\node\node.exe
set NSSM=%APP%\nssm\nssm.exe
set SVC=AgriBillPro

echo [1/5] Running DB migration...
"%NODE%" "%APP%\backend\src\db\migrate.js" || echo Migration skipped (ok on upgrade)

echo [2/5] Removing old service if exists...
"%NSSM%" stop %SVC% 2>nul
"%NSSM%" remove %SVC% confirm 2>nul

echo [3/5] Installing Windows service...
"%NSSM%" install %SVC% "%NODE%" "%APP%\backend\src\index.js"
"%NSSM%" set %SVC% AppDirectory "%APP%"
"%NSSM%" set %SVC% AppEnvironmentExtra "NODE_ENV=production" "PORT=5000"
"%NSSM%" set %SVC% AppStdout "%LOCALAPPDATA%\AgriBillPro\logs\app.log"
"%NSSM%" set %SVC% AppStderr "%LOCALAPPDATA%\AgriBillPro\logs\error.log"
"%NSSM%" set %SVC% Start SERVICE_AUTO_START

echo [4/5] Starting service...
"%NSSM%" start %SVC% || echo Service start will retry on reboot

echo [5/5] Done.
exit /b 0
