@echo off
title Swarm Gallery - Installer
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

set REPO_URL=https://github.com/Ken-n7/swarm-gallery/archive/refs/heads/main.zip
set INSTALL_DIR=C:\swarm-gallery
set NODE_VER=22.11.0
set NODE_MIN=18

:: ─── Self-elevate to admin ────────────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    cls
    echo.
    echo  ============================================================
    echo    Swarm Gallery Installer
    echo  ============================================================
    echo.
    echo  A Windows security prompt will appear.
    echo  Click YES to allow the installer to continue.
    echo.
    powershell -NoProfile -Command ^
      "Start-Process -FilePath cmd.exe -ArgumentList '/c ""%~f0""' -Verb RunAs -Wait"
    exit /b
)

cls
echo.
echo  ============================================================
echo    Swarm Gallery  ^|  K3DP Events
echo    Installer
echo  ============================================================
echo.
echo  Starting setup — this takes about 3-5 minutes.
echo  You do not need to do anything until it finishes.
echo.

:: ─── Internet check ───────────────────────────────────────────────────────────
call :step "Checking internet connection..."
powershell -NoProfile -Command ^
  "try{(New-Object Net.WebClient).DownloadString('http://www.msftconnecttest.com/connecttest.txt')|Out-Null;exit 0}catch{exit 1}" >nul 2>&1
if %errorlevel% neq 0 (
    call :fail "No internet connection detected." ^
               "Connect to Wi-Fi or a network cable, then run this installer again."
)
call :ok "Connected."

:: ─── Node.js check / install ──────────────────────────────────────────────────
call :step "Checking for Node.js..."

if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    if "%PROCESSOR_ARCHITEW6432%"=="" (set NODE_ARCH=x86) else (set NODE_ARCH=x64)
) else (
    set NODE_ARCH=x64
)
set NODE_URL=https://nodejs.org/dist/v%NODE_VER%/node-v%NODE_VER%-%NODE_ARCH%.msi
set NODE_MSI=%TEMP%\node-installer.msi

where node >nul 2>&1
if %errorlevel% neq 0 goto :install_node
for /f "tokens=2 delims=v." %%M in ('node -v 2^>nul') do set NODE_MAJOR=%%M
if not defined NODE_MAJOR goto :install_node
if %NODE_MAJOR% LSS %NODE_MIN% goto :install_node
call :ok "Node.js found."
goto :after_node

:install_node
call :step "Node.js not found — downloading (this may take a minute)..."
call :download_file "%NODE_URL%" "%NODE_MSI%" "Node.js installer"

call :step "Installing Node.js..."
msiexec /i "%NODE_MSI%" /qn /norestart >nul 2>&1
del "%NODE_MSI%" >nul 2>&1

:: Refresh PATH from registry so node is usable in this session
for /f "tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
if defined SYS_PATH set "PATH=%SYS_PATH%;%PATH%"

where node >nul 2>&1
if %errorlevel% neq 0 (
    call :fail "Node.js installation did not complete." ^
               "Please install it manually from https://nodejs.org then run this installer again."
)
call :ok "Node.js installed."

:after_node

:: ─── Handle existing installation ────────────────────────────────────────────
if not exist "%INSTALL_DIR%" goto :download

echo.
echo  ──────────────────────────────────────────────────────────────
echo    Swarm Gallery is already installed.
echo  ──────────────────────────────────────────────────────────────
echo.
echo    1  Update to the latest version  ^(your password is kept^)
echo    2  Reinstall from scratch
echo    3  Exit
echo.
:choice_loop
set /p CHOICE="  Type 1, 2, or 3 and press Enter: "
if "%CHOICE%"=="1" goto :update_mode
if "%CHOICE%"=="2" goto :clean_install
if "%CHOICE%"=="3" exit /b 0
echo    Please type 1, 2, or 3.
goto :choice_loop

:update_mode
set PRESERVE_ENV=1
call :step "Saving your settings..."
if exist "%INSTALL_DIR%\server\.env" copy /y "%INSTALL_DIR%\server\.env" "%TEMP%\swarm_env_bak.txt" >nul 2>&1
call :ok "Settings saved."
goto :download

:clean_install
set PRESERVE_ENV=0
call :step "Removing previous installation..."
rd /s /q "%INSTALL_DIR%" >nul 2>&1
call :ok "Removed."
goto :download

:: ─── Download repo ────────────────────────────────────────────────────────────
:download
echo.
call :step "Downloading Swarm Gallery..."
set ZIP=%TEMP%\swarm-gallery.zip
set XTMP=%TEMP%\swarm-gallery-extract
del /f /q "%ZIP%" >nul 2>&1
rd /s /q "%XTMP%" >nul 2>&1

call :download_file "%REPO_URL%" "%ZIP%" "Swarm Gallery"
call :ok "Downloaded."

:: ─── Extract ─────────────────────────────────────────────────────────────────
call :step "Unpacking files..."
powershell -NoProfile -Command ^
  "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%XTMP%' -Force" >nul 2>&1
if %errorlevel% neq 0 (
    del /f /q "%ZIP%" >nul 2>&1
    call :fail "Could not unpack the download." ^
               "The file may be corrupt. Run the installer again."
)
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1
robocopy "%XTMP%\swarm-gallery-main" "%INSTALL_DIR%" /e /is /it /njh /njs /ndl /nc /ns >nul 2>&1
rd /s /q "%XTMP%" >nul 2>&1
del /f /q "%ZIP%" >nul 2>&1

if "%PRESERVE_ENV%"=="1" (
    if exist "%TEMP%\swarm_env_bak.txt" (
        copy /y "%TEMP%\swarm_env_bak.txt" "%INSTALL_DIR%\server\.env" >nul 2>&1
        del /f /q "%TEMP%\swarm_env_bak.txt" >nul 2>&1
    )
)
call :ok "Files ready."

:: ─── Run setup ────────────────────────────────────────────────────────────────
echo.
echo  Setting up the app — the next few steps take 2-3 minutes.
echo  You will see some technical output. That is normal.
echo.
cd /d "%INSTALL_DIR%"
call setup.bat
if %errorlevel% neq 0 (
    call :fail "Setup did not complete." ^
               "Try running the installer again. If it keeps failing, contact support."
)

:: ─── Done ─────────────────────────────────────────────────────────────────────
cls
echo.
echo  ============================================================
echo    All done!
echo.
echo    Double-click  "Swarm Gallery"  on your Desktop to start.
echo.
echo    You will not need to run this installer again.
echo    To update later, run  update.bat  inside  C:\swarm-gallery
echo  ============================================================
echo.
pause
exit /b 0

:: ═════════════════════════════════════════════════════════════════════
::  Helpers
:: ═════════════════════════════════════════════════════════════════════

:step
echo.
echo  ...  %~1
goto :eof

:ok
echo    OK   %~1
goto :eof

:fail
echo.
echo  ============================================================
echo    Something went wrong:
echo    %~1
if not "%~2"=="" echo.
if not "%~2"=="" echo    %~2
echo  ============================================================
echo.
echo  Press any key to close.
pause >nul
exit /b 1

:download_file
:: %1 = URL, %2 = dest path, %3 = friendly name
set _DL_OK=0
for /l %%t in (1,1,3) do (
    if !_DL_OK!==0 (
        powershell -NoProfile -Command ^
          "try{$wc=New-Object Net.WebClient;$wc.DownloadFile('%~1','%~2');exit 0}catch{exit 1}" >nul 2>&1
        if !errorlevel!==0 (
            set _DL_OK=1
        ) else (
            if %%t LSS 3 (
                echo    Download attempt %%t failed — retrying...
                timeout /t 4 /nobreak >nul
            )
        )
    )
)
if %_DL_OK%==0 (
    call :fail "Could not download %~3 after 3 attempts." ^
               "Check your internet connection and try again."
)
goto :eof
