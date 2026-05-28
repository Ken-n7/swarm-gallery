@echo off
title Swarm Gallery
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Swarm Gallery
echo  ==========================================
echo.

:: ─── Node.js ──────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Node.js not installed. Run setup.bat first.
  echo.
  pause
  exit /b 1
)

:: ─── First-run check ──────────────────────────────────────────────
if not exist "server\node_modules" goto :setup
if not exist "client\.next"        goto :setup
goto :launch

:setup
echo  Running first-time setup...
echo.
call setup.bat
if %errorlevel% neq 0 exit /b 1

:: ─── Launch ───────────────────────────────────────────────────────
:launch
echo  Starting server...
start "Swarm Gallery - Server" cmd /k "title Swarm Gallery - Server && cd /d "%~dp0server" && node index.js"
timeout /t 3 /nobreak >nul

echo  Starting client...
start "Swarm Gallery - Client" cmd /k "title Swarm Gallery - Client && cd /d "%~dp0client" && npm start"
timeout /t 5 /nobreak >nul

:: Open admin panel
start "" "http://localhost:3000/admin"

echo.
echo  ==========================================
echo   Ready!
echo.
echo   Admin panel is opening in your browser.
echo   Use the Network card to find the guest
echo   link for your current network.
echo  ==========================================
echo.
echo  Press any key to shut everything down.
pause >nul

taskkill /fi "WindowTitle eq Swarm Gallery - Server*" /t /f >nul 2>&1
taskkill /fi "WindowTitle eq Swarm Gallery - Client*" /t /f >nul 2>&1
echo.
echo  Stopped. Safe to close this window.
