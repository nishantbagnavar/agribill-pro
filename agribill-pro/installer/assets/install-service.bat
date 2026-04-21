@echo off
:: Run as Administrator
:: Registers AgriBill Pro as a Windows service using nssm

set APP_DIR=%~dp0
set NODE_EXE=%APP_DIR%runtime\node\node.exe
set NSSM=%APP_DIR%nssm\nssm.exe
set SERVICE=AgriBillPro
set LOG_DIR=%LOCALAPPDATA%\AgriBillPro\logs

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo Installing AgriBill Pro service...

"%NSSM%" install %SERVICE% "%NODE_EXE%" "backend\src\index.js"
"%NSSM%" set %SERVICE% AppDirectory "%APP_DIR%"
"%NSSM%" set %SERVICE% AppEnvironmentExtra NODE_ENV=production PORT=5000
"%NSSM%" set %SERVICE% AppStdout "%LOG_DIR%\app.log"
"%NSSM%" set %SERVICE% AppStderr "%LOG_DIR%\error.log"
"%NSSM%" set %SERVICE% Start SERVICE_AUTO_START
"%NSSM%" start %SERVICE%

echo Done. AgriBill Pro is running at http://localhost:5000
pause
