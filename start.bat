@echo off
title Swarm Gallery
cd /d "%~dp0"

set SERVER_IP=192.168.137.1
set SERVER_PORT=4000
set CLIENT_PORT=3000
set GUEST_URL=http://%SERVER_IP%:%CLIENT_PORT%/event/demo

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed.
  echo Run setup.bat first.
  pause
  exit /b 1
)

:: Check setup was run
if not exist "server\node_modules" (
  echo Dependencies not installed. Running setup first...
  echo.
  call setup.bat
  if %errorlevel% neq 0 exit /b 1
)

if not exist "client\.next" (
  echo Client not built. Running setup first...
  echo.
  call setup.bat
  if %errorlevel% neq 0 exit /b 1
)

:: Check if IP in .env.local matches — rebuild if changed
set EXPECTED=NEXT_PUBLIC_SERVER_URL=http://%SERVER_IP%:%SERVER_PORT%
set CURRENT=
for /f "usebackq delims=" %%l in ("client\.env.local") do set CURRENT=%%l
if not "%CURRENT%"=="%EXPECTED%" (
  echo Hotspot IP changed. Rebuilding client...
  echo %EXPECTED%> client\.env.local
  cd client
  call npm run build
  if %errorlevel% neq 0 (
    echo ERROR: Client build failed.
    pause
    exit /b 1
  )
  cd ..
)

:: Launch server
echo Starting server...
start "Swarm Gallery - Server" cmd /k "cd /d "%~dp0server" && node index.js"

:: Small delay so server socket is ready before client starts
timeout /t 3 /nobreak >nul

:: Launch client
echo Starting client...
start "Swarm Gallery - Client" cmd /k "cd /d "%~dp0client" && npm start -- -p %CLIENT_PORT%"

:: Wait a moment then open the admin page
timeout /t 5 /nobreak >nul
start "" "http://localhost:%CLIENT_PORT%/admin"

echo.
echo  ================================
echo   Swarm Gallery is running!
echo.
echo   Admin:  http://localhost:%CLIENT_PORT%/admin
echo   Guests: %GUEST_URL%
echo.
echo   Make sure your Wi-Fi hotspot is ON
echo   and share the Guests URL above.
echo  ================================
echo.
echo Press any key to stop both servers.
pause >nul

:: Kill both windows on exit
taskkill /fi "WindowTitle eq Swarm Gallery - Server*" /t /f >nul 2>&1
taskkill /fi "WindowTitle eq Swarm Gallery - Client*" /t /f >nul 2>&1
echo Servers stopped.
