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
node server.js

echo.
echo Server stopped or failed. Check the message above.
pause
