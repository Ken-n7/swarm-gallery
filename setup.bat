@echo off
title Swarm Gallery - Setup
cd /d "%~dp0"
setlocal EnableDelayedExpansion

set TOOLS=%~dp0tools
set LOG=%TEMP%\swarm-setup.log

:: Header
powershell -NoProfile -Command ^
  "Write-Host '';" ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host '   Swarm Gallery  |  Setup' -ForegroundColor Cyan;" ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host ''"

:: Node.js check
where node >nul 2>&1
if %errorlevel% equ 0 goto node_ok

powershell -NoProfile -Command "Write-Host '  Node.js not found - installing automatically...' -ForegroundColor Yellow"
echo.

where winget >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Write-Host '  [!]  winget not available.' -ForegroundColor Red"
    powershell -NoProfile -Command "Write-Host '       Install Node.js manually from https://nodejs.org then run setup again.' -ForegroundColor DarkGray"
    echo.
    pause & exit /b 1
)

powershell -NoProfile -Command "Write-Host '   ~   Downloading Node.js LTS via winget...' -ForegroundColor Yellow"
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Write-Host '  [!]  winget install failed.' -ForegroundColor Red"
    powershell -NoProfile -Command "Write-Host '       Install Node.js manually from https://nodejs.org then run setup again.' -ForegroundColor DarkGray"
    echo.
    pause & exit /b 1
)

:: Try to pick up the new install in this session before restarting
set "PATH=C:\Program Files\nodejs\;%APPDATA%\npm;%PATH%"
where node >nul 2>&1
if %errorlevel% equ 0 (
    powershell -NoProfile -Command "Write-Host '  [+]  Node.js installed.' -ForegroundColor Green"
    echo.
    goto node_ok
)

:: PATH refresh did not work - relaunch in a fresh process
powershell -NoProfile -Command "Write-Host '  [+]  Node.js installed. Restarting setup to pick up the new PATH...' -ForegroundColor Green"
echo.
start "" "%~f0"
exit /b 0

:node_ok
for /f "tokens=1 delims=v." %%M in ('node -v 2^>nul') do set NODE_MAJOR=%%M
for /f "tokens=*"          %%v in ('node -v')         do set NODE_VER=%%v

if %NODE_MAJOR% LSS 18 (
    powershell -NoProfile -Command "Write-Host '  [!]  Node.js %NODE_VER% is too old. Need v18+.' -ForegroundColor Red"
    powershell -NoProfile -Command "Write-Host '       Download a newer version from https://nodejs.org' -ForegroundColor DarkGray"
    echo.
    pause & exit /b 1
)

powershell -NoProfile -Command "Write-Host '  [+]  Node.js %NODE_VER%' -ForegroundColor Green"
echo.

:: [1/4] Server packages
powershell -NoProfile -Command "Write-Host '  [1/4]  Server packages' -ForegroundColor DarkCyan"
powershell -NoProfile -File "%TOOLS%\run.ps1" -Msg "npm install (server)" -Cmd "npm install --prefer-offline" -Dir "%~dp0server" -Log "%LOG%"
if %errorlevel% neq 0 (
    echo.
    powershell -NoProfile -Command "if(Test-Path '%LOG%'){Get-Content '%LOG%' | Select-Object -Last 20}"
    echo.
    pause & exit /b 1
)
echo.

:: [2/4] Client packages
powershell -NoProfile -Command "Write-Host '  [2/4]  Client packages' -ForegroundColor DarkCyan"
powershell -NoProfile -File "%TOOLS%\run.ps1" -Msg "npm install (client)" -Cmd "npm install --prefer-offline" -Dir "%~dp0client" -Log "%LOG%"
if %errorlevel% neq 0 (
    echo.
    powershell -NoProfile -Command "if(Test-Path '%LOG%'){Get-Content '%LOG%' | Select-Object -Last 20}"
    echo.
    pause & exit /b 1
)
echo.

:: [3/4] Config
powershell -NoProfile -Command "Write-Host '  [3/4]  Config' -ForegroundColor DarkCyan"

for /f "tokens=*" %%s in ('powershell -NoProfile -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))" 2^>nul') do set COOKIE_SECRET=%%s
if "%COOKIE_SECRET%"=="" set COOKIE_SECRET=swarm-fallback-secret

if not exist "server\.env" (
    (
        echo PORT=4000
        echo CLIENT_PORT=3000
        echo ADMIN_PASSWORD=admin123
        echo COOKIE_SECRET=%COOKIE_SECRET%
    ) > server\.env
    powershell -NoProfile -Command "Write-Host '   [+]  server\.env created  (default password: admin123)' -ForegroundColor Green"
) else (
    powershell -NoProfile -Command "Write-Host '   [~]  server\.env already exists - keeping your config' -ForegroundColor DarkGray"
)

if not exist "client\.env.local" echo.> client\.env.local
powershell -NoProfile -Command "Write-Host '   [+]  client\.env.local ready' -ForegroundColor Green"
echo.

:: [4/4] Build
powershell -NoProfile -Command "Write-Host '  [4/4]  Building the app  (slowest step - 1-2 min)' -ForegroundColor DarkCyan"
powershell -NoProfile -File "%TOOLS%\run.ps1" -Msg "next build" -Cmd "npm run build" -Dir "%~dp0client" -Log "%LOG%"
if %errorlevel% neq 0 (
    echo.
    powershell -NoProfile -Command "if(Test-Path '%LOG%'){Get-Content '%LOG%' | Select-Object -Last 20}"
    echo.
    pause & exit /b 1
)
echo.

:: Desktop shortcut
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s  = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Swarm Gallery.lnk');" ^
  "$s.TargetPath       = '%~dp0start.bat';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description      = 'Start Swarm Gallery';" ^
  "$s.IconLocation     = '%~dp0client\public\favicon.ico';" ^
  "$s.WindowStyle      = 1;" ^
  "$s.Save()" >nul 2>&1
powershell -NoProfile -Command "Write-Host '  [+]  Desktop shortcut created (with app icon)' -ForegroundColor Green"
echo.

del /f /q "%LOG%" >nul 2>&1

:: Done
powershell -NoProfile -Command ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host '   Setup complete!' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host '   Double-click Swarm Gallery on your Desktop to start.' -ForegroundColor White;" ^
  "Write-Host '';" ^
  "Write-Host '   Admin password : admin123' -ForegroundColor White;" ^
  "Write-Host '   Change it in   : server\.env  >  ADMIN_PASSWORD' -ForegroundColor DarkGray;" ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host ''"

pause
endlocal
exit /b 0
