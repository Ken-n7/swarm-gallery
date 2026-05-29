@echo off
title Swarm Gallery - Setup
cd /d "%~dp0"
setlocal EnableDelayedExpansion

set LOG=%TEMP%\swarm-setup.log

echo.
echo  ============================================================
echo    Swarm Gallery  ^|  Setup
echo  ============================================================
echo.

:: ─── Node.js check ───────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo.
    echo    1. Open https://nodejs.org
    echo    2. Download and install the LTS version
    echo    3. Run setup again
    echo.
    pause & exit /b 1
)

for /f "tokens=2 delims=v." %%M in ('node -v 2^>nul') do set NODE_MAJOR=%%M
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
if %NODE_MAJOR% LSS 18 (
    echo  [ERROR] Node.js %NODE_VER% is too old. Need v18 or newer.
    echo    Download from https://nodejs.org
    echo.
    pause & exit /b 1
)
echo  Node.js %NODE_VER%  OK
echo.

:: ─── Server packages ─────────────────────────────────────────────────────────
echo  [1/4] Installing server packages...
echo        Please wait...
cd server
call npm install --prefer-offline > "%LOG%" 2>&1
set NPM_ERR=%errorlevel%
cd ..
if %NPM_ERR% neq 0 (
    echo.
    echo  [ERROR] Server package install failed.
    call :show_log
    pause & exit /b 1
)
echo        Done.
echo.

:: ─── Client packages ─────────────────────────────────────────────────────────
echo  [2/4] Installing client packages...
echo        Please wait...
cd client
call npm install --prefer-offline > "%LOG%" 2>&1
set NPM_ERR=%errorlevel%
cd ..
if %NPM_ERR% neq 0 (
    echo.
    echo  [ERROR] Client package install failed.
    call :show_log
    pause & exit /b 1
)
echo        Done.
echo.

:: ─── Config ──────────────────────────────────────────────────────────────────
echo  [3/4] Writing config...

for /f "tokens=*" %%s in ('powershell -NoProfile -Command ^
  "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))" 2^>nul') do set COOKIE_SECRET=%%s
if "%COOKIE_SECRET%"=="" set COOKIE_SECRET=swarm-fallback-secret

if not exist "server\.env" (
    (
        echo PORT=4000
        echo CLIENT_PORT=3000
        echo ADMIN_PASSWORD=admin123
        echo COOKIE_SECRET=%COOKIE_SECRET%
    ) > server\.env
    echo        server\.env created.  Default password: admin123
) else (
    echo        server\.env already exists — keeping your existing config.
)

if not exist "client\.env.local" echo.> client\.env.local

echo        Done.
echo.

:: ─── Build client ────────────────────────────────────────────────────────────
echo  [4/4] Building the app...
echo        This is the slowest step — about 1-2 minutes. Please wait.
cd client
call npm run build > "%LOG%" 2>&1
set BUILD_ERR=%errorlevel%
cd ..
if %BUILD_ERR% neq 0 (
    echo.
    echo  [ERROR] Build failed.
    call :show_log
    pause & exit /b 1
)
echo        Done.
echo.

:: ─── Desktop shortcut ────────────────────────────────────────────────────────
powershell -NoProfile -Command ^
  "$ws=New-Object -ComObject WScript.Shell;" ^
  "$s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Swarm Gallery.lnk');" ^
  "$s.TargetPath='%~dp0start.bat';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.Description='Start Swarm Gallery';" ^
  "$s.WindowStyle=1;" ^
  "$s.Save()" >nul 2>&1
echo  Shortcut created on Desktop.
echo.

del /f /q "%LOG%" >nul 2>&1

:: ─── Done ────────────────────────────────────────────────────────────────────
echo  ============================================================
echo    Setup complete!
echo.
echo    Double-click "Swarm Gallery" on your Desktop to start.
echo.
echo    Admin password: admin123
echo    To change it: open server\.env and edit ADMIN_PASSWORD
echo  ============================================================
echo.
pause
endlocal
exit /b 0

:show_log
echo.
echo  ── Last lines from log ──────────────────────────────────────
powershell -NoProfile -Command ^
  "if(Test-Path '%LOG%'){Get-Content '%LOG%' | Select-Object -Last 15}" 2>nul
echo  ─────────────────────────────────────────────────────────────
echo.
goto :eof
