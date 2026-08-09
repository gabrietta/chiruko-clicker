@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0regenerate-altar-voice.ps1"
if errorlevel 1 goto failed
echo DONE: altar voice regenerated.
pause
exit /b 0
:failed
echo FAILED: check the error above.
pause
exit /b 1
