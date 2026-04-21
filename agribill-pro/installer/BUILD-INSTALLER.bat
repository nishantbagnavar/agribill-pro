@echo off
setlocal enabledelayedexpansion
title AgriBill Pro — Build Installer

echo ============================================
echo   AgriBill Pro  Installer Builder
echo ============================================
echo.

:: Check Node
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH. Install from nodejs.org.
    pause & exit /b 1
)

:: Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found. Reinstall Node.js.
    pause & exit /b 1
)

:: Find ISCC (Inno Setup compiler)
set ISCC=
for %%d in (
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    "C:\Program Files\Inno Setup 6\ISCC.exe"
    "C:\Program Files (x86)\Inno Setup 5\ISCC.exe"
) do (
    if exist %%d set ISCC=%%d
)

if "!ISCC!"=="" (
    echo [ERROR] Inno Setup not found!
    echo.
    echo Please install Inno Setup 6 from:
    echo   https://jrsoftware.org/isdl.php
    echo.
    echo Then run this script again.
    pause & exit /b 1
)
echo [OK] Found Inno Setup: !ISCC!

:: Check installer assets
if not exist "%~dp0assets\node\node.exe" (
    echo [ERROR] Missing: installer\assets\node\node.exe
    echo Download standalone node.exe from: https://nodejs.org/dist/v20.18.0/win-x64/node.exe
    pause & exit /b 1
)
echo [OK] node.exe found

if not exist "%~dp0assets\nssm\nssm.exe" (
    echo [ERROR] Missing: installer\assets\nssm\nssm.exe
    echo Download from: https://nssm.cc/download - extract nssm.exe from win64 folder
    pause & exit /b 1
)
echo [OK] nssm.exe found

if not exist "%~dp0assets\icon.ico" (
    echo [ERROR] Missing: installer\assets\icon.ico
    echo Run: node scripts/make-icon.js
    pause & exit /b 1
)
echo [OK] icon.ico found

:: Build frontend
echo.
echo [1/4] Building frontend...
cd /d "%~dp0.."
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause & exit /b 1
)
echo [OK] Frontend built.

:: Install backend production dependencies
echo.
echo [2/4] Installing backend production deps...
cd backend
call npm install --omit=dev --prefer-offline
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    cd ..
    pause & exit /b 1
)
cd ..
echo [OK] Dependencies installed.

:: Create output dir
if not exist "%~dp0output" mkdir "%~dp0output"

:: Compile installer
echo.
echo [3/4] Compiling installer...
cd /d "%~dp0"
"!ISCC!" "agribill-pro.iss"
if %errorlevel% neq 0 (
    echo [ERROR] Inno Setup compilation failed!
    pause & exit /b 1
)

echo.
echo ============================================
echo   SUCCESS!
echo ============================================
echo.
echo Output: installer\output\AgriBillPro-Setup-1.0.0.exe
echo.
echo This .exe is ready to give to shopkeepers!
echo.
pause
