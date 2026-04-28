@echo off
title AgriBill Pro - Build ZIP Package
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD-ZIP.ps1"
if %errorlevel% neq 0 pause
