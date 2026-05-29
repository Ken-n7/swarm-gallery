@echo off
title Swarm Gallery
cd /d "%~dp0"
setlocal EnableDelayedExpansion

echo.
echo  ============================================================
echo    Swarm Gallery  ^|  K3DP Events
echo  ============================================================
echo.

:: ─── Node.js ─────────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js is not installed.
  echo          Run setup.bat first.
  echo.
  pause & exit /b 1
)

:: ─── First-run check ─────────────────────────────────────────────────────────
:: If deps or config are missing, run setup and skip the rebuild below
:: (setup.bat already builds the client as its final step).
set SKIP_BUILD=0

if not exist "server\node_modules" goto :needs_setup
if not exist "server\.env"         goto :needs_setup
if not exist "client\node_modules" goto :needs_setup
if not exist "client\.next"        goto :needs_setup
goto :build

:needs_setup
echo  First run — launching setup...
echo.
call setup.bat
if %errorlevel% neq 0 exit /b 1
set SKIP_BUILD=1
goto :launch

:: ─── Rebuild client ───────────────────────────────────────────────────────────
:: Always rebuild on subsequent starts so code changes are picked up.
:build
if %SKIP_BUILD%==1 goto :launch

echo  Building client  ^(picking up any changes^)...
cd client
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo  [ERROR] Build failed. Check output above.
  pause & exit /b 1
)
cd ..
echo  Build complete.
echo.

:: ─── Launch server ────────────────────────────────────────────────────────────
:launch
echo  Starting server...
start "Swarm Gallery - Server" cmd /k ^
  "title Swarm Gallery - Server && cd /d "%~dp0server" && node index.js"

:: Wait for server to accept connections on port 4000 (max 30 s)
set /a TRIES=0
:wait_server
set /a TRIES+=1
powershell -NoProfile -Command ^
  "try { $null = (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1',4000); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto :server_ready
if %TRIES% GEQ 30 (
  echo  [ERROR] Server did not start within 30 seconds.
  echo          Check the Server window for errors.
  pause & exit /b 1
)
timeout /t 1 /nobreak >nul
goto :wait_server

:server_ready
echo  Server ready.
echo.

:: ─── Launch client ────────────────────────────────────────────────────────────
echo  Starting client...
start "Swarm Gallery - Client" cmd /k ^
  "title Swarm Gallery - Client && cd /d "%~dp0client" && npm start"

:: Wait for client to accept connections on port 3000 (max 30 s)
set /a TRIES=0
:wait_client
set /a TRIES+=1
powershell -NoProfile -Command ^
  "try { $null = (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1',3000); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto :client_ready
if %TRIES% GEQ 30 (
  echo  [ERROR] Client did not start within 30 seconds.
  echo          Check the Client window for errors.
  pause & exit /b 1
)
timeout /t 1 /nobreak >nul
goto :wait_client

:client_ready
echo  Client ready.
echo.

:: ─── Detect admin password ────────────────────────────────────────────────────
set ADMIN_PW=admin123
for /f "tokens=2 delims==" %%p in ('findstr /i "ADMIN_PASSWORD" server\.env 2^>nul') do set ADMIN_PW=%%p

:: ─── Detect guest URL ────────────────────────────────────────────────────────
:: Ask the running server which IP it prefers (hotspot-first logic in server/utils/qr.js).
:: Falls back to "check the Network card in the admin panel" if the API isn't ready.
set GUEST_URL=http://localhost:3000/event/demo
for /f "tokens=*" %%u in ('powershell -NoProfile -Command ^
  "try { $r=(Invoke-RestMethod http://localhost:4000/admin/network -ErrorAction Stop 2>$null); if($r.liveIp){\"http://$($r.liveIp):3000/event/demo\"}else{\"\"} } catch { \"\" }"') do (
  if not "%%u"=="" set GUEST_URL=%%u
)

:: ─── Open admin panel ─────────────────────────────────────────────────────────
start "" "http://localhost:3000/admin"

:: ─── Ready ────────────────────────────────────────────────────────────────────
echo  ============================================================
echo    Ready!
echo.
echo    Admin panel   ^>  http://localhost:3000/admin
echo    Password      ^>  %ADMIN_PW%
echo.
echo    Guest link    ^>  %GUEST_URL%
echo    ^(Share this URL or the QR code from the admin panel^)
echo.
echo    Press any key to shut everything down.
echo  ============================================================
echo.
pause >nul

:: ─── Shutdown ─────────────────────────────────────────────────────────────────
echo.
echo  Stopping...
taskkill /fi "WindowTitle eq Swarm Gallery - Server*" /t /f >nul 2>&1
taskkill /fi "WindowTitle eq Swarm Gallery - Client*" /t /f >nul 2>&1
echo  Stopped. Safe to close this window.
endlocal
