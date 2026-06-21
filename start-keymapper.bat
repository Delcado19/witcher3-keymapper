@echo off
setlocal

cd /d "%~dp0"
if not defined PORT set "PORT=5177"

echo Starting Witcher 3 Keymapper at http://127.0.0.1:%PORT%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: node.exe was not found in PATH.
  pause
  exit /b 1
)

node --version
echo.

REM Open the browser once the server is up. listen() binds immediately (the
REM localization cache is lazy), so a short detached delay is enough.
REM ponytail: fixed 2s wait, not a port poll. If a slow machine ever loads the
REM page before node binds, a single refresh fixes it; switch to a poll then.
start "" /b cmd /c "timeout /t 2 >nul & start "" http://127.0.0.1:%PORT%"

node server.js

echo.
echo Server stopped or failed. Check the message above.
pause
