@echo off
:: Run as Administrator
:: Stops and removes the AgriBill Pro Windows service

set NSSM=%~dp0nssm\nssm.exe
set SERVICE=AgriBillPro

echo Stopping AgriBill Pro service...
"%NSSM%" stop %SERVICE%
"%NSSM%" remove %SERVICE% confirm

echo Service removed.
pause
