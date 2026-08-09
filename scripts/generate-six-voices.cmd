@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0generate-six-voices.ps1"
if errorlevel 1 goto failed
echo DONE: six voice clips generated.
pause
exit /b 0
:failed
echo FAILED: check the error above.
pause
exit /b 1
