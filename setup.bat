@echo off
title Swarm Gallery - Setup
cd /d "%~dp0"
setlocal EnableDelayedExpansion

echo.
echo  ============================================================
echo    Swarm Gallery  ^|  First-Time Setup
echo  ============================================================
echo.

:: ─── Node.js check ───────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js is not installed.
  echo.
  echo    1. Open https://nodejs.org
  echo    2. Download and install the LTS version  ^(v18 or newer^)
  echo    3. Restart this setup
  echo.
  pause & exit /b 1
)

for /f "tokens=1 delims=v." %%M in ('node -v') do set _dummy=%%M
for /f "tokens=2 delims=v." %%M in ('node -v') do set NODE_MAJOR=%%M
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v

if %NODE_MAJOR% LSS 18 (
  echo  [ERROR] Node.js %NODE_VER% is too old. Minimum required: v18
  echo.
  echo    Download the current LTS from https://nodejs.org
  echo.
  pause & exit /b 1
)

echo  Node.js %NODE_VER% — OK
echo.

:: ─── Server dependencies ─────────────────────────────────────────────────────
echo  [1/4] Installing server packages...
cd server
call npm install --prefer-offline 2>&1 | findstr /i "error warning added"
if %errorlevel% neq 0 (
  echo  [ERROR] Server install failed. Check the output above.
  pause & exit /b 1
)
cd ..
echo         Done.
echo.

:: ─── Client dependencies ─────────────────────────────────────────────────────
echo  [2/4] Installing client packages...
cd client
call npm install --prefer-offline 2>&1 | findstr /i "error warning added"
if %errorlevel% neq 0 (
  echo  [ERROR] Client install failed. Check the output above.
  pause & exit /b 1
)
cd ..
echo         Done.
echo.

:: ─── Write config files ───────────────────────────────────────────────────────
echo  [3/4] Writing config...

:: Generate a random cookie secret with PowerShell
for /f "tokens=*" %%s in ('powershell -NoProfile -Command ^
  "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"') do set COOKIE_SECRET=%%s
if "%COOKIE_SECRET%"=="" set COOKIE_SECRET=swarm-change-before-event

:: Write server .env (only if it doesn't already exist so we don't clobber passwords)
if not exist "server\.env" (
  (
    echo PORT=4000
    echo CLIENT_PORT=3000
    echo ADMIN_PASSWORD=admin123
    echo COOKIE_SECRET=%COOKIE_SECRET%
  ) > server\.env
  echo         Created server\.env  ^(default password: admin123^)
) else (
  echo         server\.env already exists — keeping existing config.
)

:: Client .env.local — NEXT_PUBLIC_SERVER_URL is an SSR fallback only.
:: At runtime the client derives the server URL from window.location.hostname,
:: so this just needs to point to port 4000 on the same host.
:: client/.env.local has no vars — server URL is runtime-derived.
:: Create it as an empty marker so re-runs skip this block.
if not exist "client\.env.local" (
  echo.> client\.env.local
)

echo.

:: ─── Build client ────────────────────────────────────────────────────────────
echo  [4/4] Building client  ^(takes 1-2 minutes on first run^)...
cd client
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo  [ERROR] Build failed. Check the output above.
  pause & exit /b 1
)
cd ..
echo         Done.
echo.

:: ─── Desktop shortcut ────────────────────────────────────────────────────────
set SHORTCUT=%USERPROFILE%\Desktop\Swarm Gallery.lnk
set ICON_PATH=%~dp0public\logo-512.png

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = '%~dp0start.bat';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description = 'Start Swarm Gallery';" ^
  "$s.WindowStyle = 1;" ^
  "$s.Save();" ^
  "Write-Host 'Shortcut created.'" 2>nul
echo         Desktop shortcut created.
echo.

:: ─── Done ────────────────────────────────────────────────────────────────────
echo  ============================================================
echo    Setup complete!
echo.
echo    To start the app:
echo      Double-click "Swarm Gallery" on your desktop
echo      — or — double-click start.bat
echo.
echo    Default admin password: admin123
echo    Change it in server\.env  ^(ADMIN_PASSWORD=^)
echo    then restart the app.
echo  ============================================================
echo.
pause
endlocal
