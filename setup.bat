@echo off
title Swarm Gallery - Setup
cd /d "%~dp0"

echo.
echo  ================================
echo   Swarm Gallery - First Time Setup
echo  ================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed.
  echo Download it from https://nodejs.org ^(LTS version^)
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Node.js found: %NODE_VER%
echo.

:: Install server dependencies
echo [1/3] Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
  echo ERROR: Failed to install server dependencies.
  pause
  exit /b 1
)
cd ..
echo Done.
echo.

:: Install client dependencies
echo [2/3] Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
  echo ERROR: Failed to install client dependencies.
  pause
  exit /b 1
)
cd ..
echo Done.
echo.

:: Write environment files
echo [3/3] Configuring network...
set SERVER_IP=192.168.137.1
set SERVER_PORT=4000
set CLIENT_PORT=3000

echo NEXT_PUBLIC_SERVER_URL=http://%SERVER_IP%:%SERVER_PORT%> client\.env.local

(
  echo PORT=%SERVER_PORT%
  echo CLIENT_URL=http://%SERVER_IP%:%CLIENT_PORT%
  echo ADMIN_PASSWORD=admin123
  echo COOKIE_SECRET=change-this-before-event
) > server\.env

echo Configured for hotspot IP: %SERVER_IP%
echo.

:: Build client
echo [4/4] Building client ^(this may take a minute^)...
cd client
call npm run build
if %errorlevel% neq 0 (
  echo ERROR: Client build failed.
  pause
  exit /b 1
)
cd ..
echo Done.
echo.

:: Create desktop shortcut
echo Creating desktop shortcut...
set SHORTCUT=%USERPROFILE%\Desktop\Swarm Gallery.lnk
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = '%~dp0start.bat';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.IconLocation = '%~dp0logo.ico';" ^
  "$s.Description = 'Launch Swarm Gallery';" ^
  "$s.Save()"
echo Done.
echo.

echo  ================================
echo   Setup complete!
echo   A shortcut has been added to your desktop.
echo   Double-click "Swarm Gallery" to launch.
echo  ================================
echo.
pause
