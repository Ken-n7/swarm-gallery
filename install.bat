@echo off
title Swarm Gallery - Installer
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: ═══════════════════════════════════════════════════════════════════
::  SWARM GALLERY  |  Installer
::  Run this once. Everything else is handled automatically.
:: ═══════════════════════════════════════════════════════════════════

set REPO_URL=https://github.com/Ken-n7/swarm-gallery/archive/refs/heads/main.zip
set INSTALL_DIR=C:\swarm-gallery
set NODE_VER=22.11.0
set NODE_MIN=18
set LOG_FILE=%TEMP%\swarm-install.log

:: ─── Step 0: Self-elevate to admin ───────────────────────────────────────────
::
:: Many steps (Node.js install, writing to C:\) need admin rights.
:: If we are not admin yet, relaunch ourselves elevated and exit.
::
net session >nul 2>&1
if %errorlevel% neq 0 (
    cls
    echo.
    echo  ============================================================
    echo    Swarm Gallery Installer
    echo  ============================================================
    echo.
    echo  This installer needs administrator permission to continue.
    echo  A Windows security prompt will appear — click YES to allow.
    echo.
    pause
    powershell -NoProfile -Command ^
      "Start-Process -FilePath cmd.exe -ArgumentList '/c ""%~f0""' -Verb RunAs -Wait"
    exit /b
)

cls
echo.
echo  ============================================================
echo    Swarm Gallery  ^|  K3DP Events
echo    Installer  v1.0
echo  ============================================================
echo.
echo  This will install Swarm Gallery on this computer.
echo  It takes about 2-5 minutes depending on your internet speed.
echo.
echo  Press any key to begin, or close this window to cancel.
pause >nul
echo.

:: ─── Step 1: Internet check ───────────────────────────────────────────────────
call :print_step "Checking internet connection..."
powershell -NoProfile -Command ^
  "try { (New-Object Net.WebClient).DownloadString('http://www.msftconnecttest.com/connecttest.txt') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "No internet connection detected."
    echo.
    echo   Please connect to Wi-Fi or a network cable, then
    echo   double-click this installer again.
    echo.
    call :wait_exit
)
call :print_ok "Connected."

:: ─── Step 2: Node.js ─────────────────────────────────────────────────────────
call :print_step "Checking for Node.js..."

:: Detect architecture
if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    if "%PROCESSOR_ARCHITEW6432%"=="" (
        set NODE_ARCH=x86
    ) else (
        set NODE_ARCH=x64
    )
) else (
    set NODE_ARCH=x64
)
set NODE_URL=https://nodejs.org/dist/v%NODE_VER%/node-v%NODE_VER%-%NODE_ARCH%.msi
set NODE_MSI=%TEMP%\node-installer.msi

where node >nul 2>&1
if %errorlevel% neq 0 goto :install_node

:: Node found — check version
for /f "tokens=2 delims=v." %%M in ('node -v 2^>nul') do set NODE_MAJOR=%%M
if not defined NODE_MAJOR goto :install_node
if %NODE_MAJOR% LSS %NODE_MIN% goto :install_node
call :print_ok "Node.js found ^(v%NODE_MAJOR%.x^). OK."
goto :after_node

:install_node
call :print_step "Node.js not found — downloading installer..."
echo.
echo   This may take a minute. Please wait.
echo.

:: Download Node.js MSI with retry
set DOWNLOAD_OK=0
for /l %%t in (1,1,3) do (
    if !DOWNLOAD_OK!==0 (
        powershell -NoProfile -Command ^
          "try { $wc=New-Object Net.WebClient; $wc.DownloadFile('%NODE_URL%','%NODE_MSI%'); exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorlevel!==0 set DOWNLOAD_OK=1
    )
)
if %DOWNLOAD_OK%==0 (
    call :print_error "Failed to download Node.js after 3 attempts."
    echo.
    echo   Check your internet connection and try again.
    echo   If the problem persists, manually install Node.js from:
    echo   https://nodejs.org
    echo.
    call :wait_exit
)

call :print_step "Installing Node.js silently (this takes 1-2 minutes)..."
msiexec /i "%NODE_MSI%" /qn /norestart >nul 2>&1
del "%NODE_MSI%" >nul 2>&1

:: Refresh PATH from registry so node is available in this session
for /f "tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
if defined SYS_PATH set "PATH=%SYS_PATH%;%PATH%"

:: Verify install worked
where node >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Node.js installation failed."
    echo.
    echo   Please install Node.js manually from https://nodejs.org
    echo   then run this installer again.
    echo.
    call :wait_exit
)
call :print_ok "Node.js installed successfully."

:after_node

:: ─── Step 3: Handle existing installation ────────────────────────────────────
if not exist "%INSTALL_DIR%" goto :download

echo.
echo  ──────────────────────────────────────────────────────────────
echo    Swarm Gallery is already installed on this computer.
echo  ──────────────────────────────────────────────────────────────
echo.
echo    1  Update to the latest version  ^(keeps your settings^)
echo    2  Reinstall from scratch        ^(resets everything^)
echo    3  Exit
echo.
set CHOICE=
set /p CHOICE="  Your choice (1/2/3): "
if "%CHOICE%"=="1" goto :update_mode
if "%CHOICE%"=="2" goto :clean_install
if "%CHOICE%"=="3" exit /b 0
echo  Invalid choice. Please type 1, 2, or 3.
goto :already_installed_menu

:update_mode
:: Preserve server\.env so password and cookie secret survive
set PRESERVE_ENV=1
echo.
echo  Backing up your settings...
if exist "%INSTALL_DIR%\server\.env" (
    copy /y "%INSTALL_DIR%\server\.env" "%TEMP%\swarm_env_backup.txt" >nul 2>&1
)
goto :download

:clean_install
set PRESERVE_ENV=0
echo.
call :print_step "Removing previous installation..."
rd /s /q "%INSTALL_DIR%" >nul 2>&1
call :print_ok "Removed."
goto :download

:download

:: ─── Step 4: Download repo ────────────────────────────────────────────────────
echo.
call :print_step "Downloading Swarm Gallery..."
set ZIP=%TEMP%\swarm-gallery.zip
set EXTRACT_TEMP=%TEMP%\swarm-gallery-extract

:: Remove any previous partial download
del /f /q "%ZIP%" >nul 2>&1
rd /s /q "%EXTRACT_TEMP%" >nul 2>&1

:: Download with retry (3 attempts)
set DOWNLOAD_OK=0
for /l %%t in (1,1,3) do (
    if !DOWNLOAD_OK!==0 (
        powershell -NoProfile -Command ^
          "try { $wc=New-Object Net.WebClient; $wc.DownloadFile('%REPO_URL%','%ZIP%'); exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorlevel!==0 (
            set DOWNLOAD_OK=1
        ) else (
            echo   Attempt %%t failed. Retrying...
            timeout /t 3 /nobreak >nul
        )
    )
)
if %DOWNLOAD_OK%==0 (
    call :print_error "Could not download Swarm Gallery."
    echo.
    echo   Please check your internet connection and try again.
    echo   If this keeps happening, contact support.
    echo.
    call :wait_exit
)
call :print_ok "Downloaded."

:: ─── Step 5: Extract ─────────────────────────────────────────────────────────
call :print_step "Extracting files..."

powershell -NoProfile -Command ^
  "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%EXTRACT_TEMP%' -Force" >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Failed to extract the download."
    echo.
    echo   The downloaded file may be corrupt. Try running this
    echo   installer again. If the problem continues, contact support.
    echo.
    del /f /q "%ZIP%" >nul 2>&1
    call :wait_exit
)

:: GitHub ZIP extracts to a subfolder named "swarm-gallery-main"
:: Move its contents to the install directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1
robocopy "%EXTRACT_TEMP%\swarm-gallery-main" "%INSTALL_DIR%" /e /is /it /njh /njs /ndl /nc /ns >nul 2>&1

:: Cleanup temp files
rd /s /q "%EXTRACT_TEMP%" >nul 2>&1
del /f /q "%ZIP%" >nul 2>&1

:: Restore server\.env if this was an update
if "%PRESERVE_ENV%"=="1" (
    if exist "%TEMP%\swarm_env_backup.txt" (
        copy /y "%TEMP%\swarm_env_backup.txt" "%INSTALL_DIR%\server\.env" >nul 2>&1
        del /f /q "%TEMP%\swarm_env_backup.txt" >nul 2>&1
        call :print_ok "Settings restored."
    )
)

call :print_ok "Files ready."

:: ─── Step 6: Run setup ────────────────────────────────────────────────────────
echo.
echo  ──────────────────────────────────────────────────────────────
echo    Installing dependencies and building the app...
echo    This is the longest step — about 2-3 minutes.
echo    You will see a lot of text. That is normal.
echo  ──────────────────────────────────────────────────────────────
echo.
pause

cd /d "%INSTALL_DIR%"
call setup.bat
if %errorlevel% neq 0 (
    echo.
    call :print_error "Setup did not complete successfully."
    echo.
    echo   See the output above for details.
    echo   Try running this installer again.
    echo   If the problem continues, contact support.
    echo.
    call :wait_exit
)

:: ─── Done ─────────────────────────────────────────────────────────────────────
cls
echo.
echo  ============================================================
echo    Installation complete!
echo.
echo    Swarm Gallery is installed at:
echo      %INSTALL_DIR%
echo.
echo    To start the app:
echo      Double-click  "Swarm Gallery"  on your Desktop
echo.
echo    You will NOT need to run this installer again.
echo    To update in the future, run  update.bat  inside the
echo    installed folder, or run this installer again.
echo  ============================================================
echo.
pause
exit /b 0

:: ═══════════════════════════════════════════════════════════════════
::  Helpers
:: ═══════════════════════════════════════════════════════════════════

:print_step
echo.
echo  ^> %~1
goto :eof

:print_ok
echo    [OK] %~1
goto :eof

:print_error
echo.
echo  ============================================================
echo    ERROR: %~1
echo  ============================================================
goto :eof

:wait_exit
echo  Press any key to close this window.
pause >nul
exit /b 1
