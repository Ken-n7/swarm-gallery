@echo off
title Swarm Gallery - Setup
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Swarm Gallery - First Time Setup
echo  ==========================================
echo.

:: ─── Node.js ──────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Node.js is not installed.
  echo.
  echo  1. Go to https://nodejs.org
  echo  2. Download and install the LTS version
  echo  3. Run this setup again
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js %NODE_VER% found.
echo.

:: ─── Server deps ──────────────────────────────────────────────────
echo  [1/4] Installing server...
cd server
call npm install
if %errorlevel% neq 0 (
  echo  ERROR: Server install failed.
  pause & exit /b 1
)
cd ..
echo         Done.
echo.

:: ─── Client deps ──────────────────────────────────────────────────
echo  [2/4] Installing client...
cd client
call npm install
if %errorlevel% neq 0 (
  echo  ERROR: Client install failed.
  pause & exit /b 1
)
cd ..
echo         Done.
echo.

:: ─── Detect IP and write env ──────────────────────────────────────
echo  [3/4] Detecting network and writing config...

set SERVER_PORT=4000
set CLIENT_PORT=3000
set SERVER_IP=

for /f "tokens=*" %%i in ('powershell -NoProfile -Command ^
  "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue ^| Sort-Object RouteMetric ^| Select-Object -First 1 ^| ForEach-Object { (Get-NetIPAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Select-Object -First 1).IPAddress })" 2^>nul') do set SERVER_IP=%%i

if "%SERVER_IP%"=="" set SERVER_IP=localhost

echo NEXT_PUBLIC_SERVER_URL=http://%SERVER_IP%:%SERVER_PORT%> client\.env.local

(
  echo PORT=%SERVER_PORT%
  echo ADMIN_PASSWORD=admin123
  echo COOKIE_SECRET=change-this-before-event
) > server\.env

echo         Network: %SERVER_IP%
echo.

:: ─── Build client ─────────────────────────────────────────────────
echo  [4/4] Building client ^(this takes 1-2 minutes^)...
cd client
call npm run build
if %errorlevel% neq 0 (
  echo  ERROR: Build failed.
  pause & exit /b 1
)
cd ..
echo         Done.
echo.

:: ─── Desktop shortcut ─────────────────────────────────────────────
echo  Creating desktop shortcut...
set SHORTCUT=%USERPROFILE%\Desktop\Swarm Gallery.lnk
powershell -NoProfile -Command ^
  "$ws=New-Object -ComObject WScript.Shell;" ^
  "$s=$ws.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath='%~dp0start.bat';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.Description='Launch Swarm Gallery';" ^
  "$s.Save()"
echo         Done.
echo.

echo  ==========================================
echo   Setup complete!
echo.
echo   Double-click "Swarm Gallery" on your
echo   desktop to start the app.
echo.
echo   NOTE: If you switch networks, the app
echo   rebuilds automatically on next launch.
echo  ==========================================
echo.
pause
