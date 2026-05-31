@echo off
title Swarm Gallery
cd /d "%~dp0"
setlocal

set TOOLS=%~dp0tools

:: Header
powershell -NoProfile -Command ^
  "Write-Host '';" ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host '   Swarm Gallery  |  K3DP Events' -ForegroundColor Cyan;" ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host ''"

:: Node.js check
where node >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Write-Host '  [!]  Node.js not found. Run setup.bat first.' -ForegroundColor Red"
    echo.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
powershell -NoProfile -Command "Write-Host '  [+]  Node.js %NODE_VER%' -ForegroundColor Green"

:: Logs folder
if not exist "logs" mkdir logs

:: First-run check
if not exist "server\node_modules" goto :needs_setup
if not exist "server\.env"         goto :needs_setup
if not exist "client\node_modules" goto :needs_setup
if not exist "client\.next"        goto :needs_setup

powershell -NoProfile -Command "Write-Host '  [+]  Dependencies ready' -ForegroundColor Green"
echo.
goto :launch

:needs_setup
powershell -NoProfile -Command "Write-Host '  First run - running setup...' -ForegroundColor Yellow"
echo.
call setup.bat
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Write-Host '  [!]  Setup failed. Check output above.' -ForegroundColor Red"
    echo.
    pause >nul
    exit /b 1
)
goto :launch

:launch

:: [1/2] Server
powershell -NoProfile -Command "Write-Host '  [1/2]  Server' -ForegroundColor DarkCyan"

powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS%\kill-port.ps1" -Port 4000

powershell -NoProfile -Command "Write-Host '   ~    Launching server...' -ForegroundColor DarkGray"
powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS%\launch.ps1" -Bin "index.js" -Dir "%~dp0server" -StdOut "%~dp0logs\server.log" -StdErr "%~dp0logs\server-err.log" -PidFile "%TEMP%\swarm-server.pid"
set /p SERVER_PID=<"%TEMP%\swarm-server.pid"
del "%TEMP%\swarm-server.pid" >nul 2>&1

if not defined SERVER_PID (
    powershell -NoProfile -Command "Write-Host '   [!]  Server process failed to launch.' -ForegroundColor Red"
    echo.
    pause & exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS%\wait-port.ps1" -Msg "Server (pid %SERVER_PID%)" -Port 4000 -MaxWait 30
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Write-Host '   [!]  Server did not come up - last log lines:' -ForegroundColor Red"
    powershell -NoProfile -Command "if(Test-Path 'logs\server-err.log'){Get-Content 'logs\server-err.log' | Select-Object -Last 10 | ForEach-Object { Write-Host '        '$_ -ForegroundColor DarkGray }}"
    echo.
    pause & exit /b 1
)

:: [2/2] Client
powershell -NoProfile -Command "Write-Host '  [2/2]  Client' -ForegroundColor DarkCyan"

powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS%\kill-port.ps1" -Port 3000

powershell -NoProfile -Command "Write-Host '   ~    Launching client...' -ForegroundColor DarkGray"
powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS%\launch.ps1" -Bin "node_modules\next\dist\bin\next start" -Dir "%~dp0client" -StdOut "%~dp0logs\client.log" -StdErr "%~dp0logs\client-err.log" -PidFile "%TEMP%\swarm-client.pid"
set /p CLIENT_PID=<"%TEMP%\swarm-client.pid"
del "%TEMP%\swarm-client.pid" >nul 2>&1

if not defined CLIENT_PID (
    powershell -NoProfile -Command "Write-Host '   [!]  Client process failed to launch.' -ForegroundColor Red"
    echo.
    pause & exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS%\wait-port.ps1" -Msg "Client (pid %CLIENT_PID%)" -Port 3000 -MaxWait 30
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Write-Host '   [!]  Client did not come up - last log lines:' -ForegroundColor Red"
    powershell -NoProfile -Command "if(Test-Path 'logs\client-err.log'){Get-Content 'logs\client-err.log' | Select-Object -Last 10 | ForEach-Object { Write-Host '        '$_ -ForegroundColor DarkGray }}"
    echo.
    pause & exit /b 1
)

echo.

:: Detect admin password
set ADMIN_PW=admin123
for /f "tokens=2 delims==" %%p in ('findstr /i "ADMIN_PASSWORD" server\.env 2^>nul') do set ADMIN_PW=%%p

:: Detect guest URL
set GUEST_URL=http://localhost:3000/event/demo
for /f "tokens=*" %%u in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS%\get-guest-url.ps1"') do (
  if not "%%u"=="" set GUEST_URL=%%u
)

:: Open admin panel
start "" "http://localhost:3000/admin"

:: Ready screen
powershell -NoProfile -Command ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host '   Ready!' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host '   Admin panel  ' -ForegroundColor DarkGray -NoNewline; Write-Host 'http://localhost:3000/admin' -ForegroundColor White;" ^
  "Write-Host '   Password     ' -ForegroundColor DarkGray -NoNewline; Write-Host '%ADMIN_PW%' -ForegroundColor Yellow;" ^
  "Write-Host '';" ^
  "Write-Host '   Guest link   ' -ForegroundColor DarkGray -NoNewline; Write-Host '%GUEST_URL%' -ForegroundColor White;" ^
  "Write-Host '   (Share this URL or the QR code from the admin panel)' -ForegroundColor DarkGray;" ^
  "Write-Host '';" ^
  "Write-Host '   Logs  >  logs\server.log   logs\client.log' -ForegroundColor DarkGray;" ^
  "Write-Host '';" ^
  "Write-Host '   Type  stop  and press Enter to shut everything down.' -ForegroundColor DarkGray;" ^
  "Write-Host ' ================================================================' -ForegroundColor DarkCyan;" ^
  "Write-Host ''"

:wait_stop
set /p "_INPUT=> "
if /i "%_INPUT%"=="stop" goto :shutdown
powershell -NoProfile -Command "Write-Host '  Type  stop  and press Enter to shut down.' -ForegroundColor DarkGray"
goto :wait_stop

:shutdown
echo.
powershell -NoProfile -Command "Write-Host '  Stopping...' -ForegroundColor Yellow"
if defined SERVER_PID taskkill /pid %SERVER_PID% /t /f >nul 2>&1
if defined CLIENT_PID taskkill /pid %CLIENT_PID% /t /f >nul 2>&1
powershell -NoProfile -Command "Write-Host '  [+]  Stopped. Safe to close this window.' -ForegroundColor Green"
endlocal
