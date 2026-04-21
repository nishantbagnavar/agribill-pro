@echo off
:: AgriBill Pro Launcher — opens the app in the default browser
:: The Node.js service should already be running via Windows Services (nssm)

set APP_URL=http://localhost:5000

:: Check if service is running; start it if not
sc query AgriBillPro | find "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo Starting AgriBill Pro service...
    net start AgriBillPro >nul 2>&1
    timeout /t 3 /nobreak >nul
)

:: Open in default browser
start "" "%APP_URL%"
