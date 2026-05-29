@echo off
title Swarm Gallery - Update
cd /d "%~dp0"
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: ═══════════════════════════════════════════════════════════════════
::  SWARM GALLERY  |  Updater
::  Run this to pull the latest version. Your password is kept.
:: ═══════════════════════════════════════════════════════════════════

set REPO_URL=https://github.com/Ken-n7/swarm-gallery/archive/refs/heads/main.zip
set INSTALL_DIR=%~dp0
set ZIP=%TEMP%\swarm-gallery-update.zip
set EXTRACT_TEMP=%TEMP%\swarm-gallery-update

echo.
echo  ============================================================
echo    Swarm Gallery  ^|  Updater
echo  ============================================================
echo.
echo  This will download and apply the latest update.
echo  Your admin password and settings will NOT be changed.
echo.
echo  Press any key to continue, or close this window to cancel.
pause >nul

:: ─── Admin check ─────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Requesting administrator access...
    powershell -NoProfile -Command ^
      "Start-Process -FilePath cmd.exe -ArgumentList '/c ""%~f0""' -Verb RunAs -Wait"
    exit /b
)

:: ─── Internet check ───────────────────────────────────────────────────────────
echo.
echo  ^> Checking internet connection...
powershell -NoProfile -Command ^
  "try { (New-Object Net.WebClient).DownloadString('http://www.msftconnecttest.com/connecttest.txt') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ============================================================
    echo    ERROR: No internet connection.
    echo  ============================================================
    echo.
    echo  Connect to the internet and try again.
    echo.
    pause & exit /b 1
)
echo    [OK] Connected.

:: ─── Back up settings ─────────────────────────────────────────────────────────
echo.
echo  ^> Saving your settings...
set HAS_ENV=0
if exist "%INSTALL_DIR%server\.env" (
    copy /y "%INSTALL_DIR%server\.env" "%TEMP%\swarm_env_backup.txt" >nul 2>&1
    set HAS_ENV=1
)
echo    [OK] Done.

:: ─── Download ─────────────────────────────────────────────────────────────────
echo.
echo  ^> Downloading latest version...
del /f /q "%ZIP%" >nul 2>&1

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
    echo.
    echo  ============================================================
    echo    ERROR: Download failed after 3 attempts.
    echo  ============================================================
    echo.
    if %HAS_ENV%==1 del /f /q "%TEMP%\swarm_env_backup.txt" >nul 2>&1
    echo  Check your internet connection and try again.
    echo.
    pause & exit /b 1
)
echo    [OK] Downloaded.

:: ─── Extract and overwrite ────────────────────────────────────────────────────
echo.
echo  ^> Applying update...
rd /s /q "%EXTRACT_TEMP%" >nul 2>&1
powershell -NoProfile -Command ^
  "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%EXTRACT_TEMP%' -Force" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ============================================================
    echo    ERROR: Could not extract the update.
    echo  ============================================================
    echo.
    pause & exit /b 1
)

:: Overwrite app files (skip server\.env so password is preserved)
robocopy "%EXTRACT_TEMP%\swarm-gallery-main" "%INSTALL_DIR%" /e /is /it /njh /njs /ndl /nc /ns ^
  /xf "server\.env" >nul 2>&1

rd /s /q "%EXTRACT_TEMP%" >nul 2>&1
del /f /q "%ZIP%" >nul 2>&1

:: Restore settings
if %HAS_ENV%==1 (
    copy /y "%TEMP%\swarm_env_backup.txt" "%INSTALL_DIR%server\.env" >nul 2>&1
    del /f /q "%TEMP%\swarm_env_backup.txt" >nul 2>&1
)
echo    [OK] Files updated.

:: ─── Rebuild client ───────────────────────────────────────────────────────────
echo.
echo  ^> Rebuilding app (1-2 minutes)...
cd /d "%INSTALL_DIR%client"
call npm install --prefer-offline >nul 2>&1
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  ============================================================
    echo    ERROR: Build failed after update.
    echo  ============================================================
    echo.
    echo  Try running start.bat — the previous version may still work.
    echo.
    pause & exit /b 1
)
cd /d "%INSTALL_DIR%"
echo    [OK] Build complete.

:: ─── Done ─────────────────────────────────────────────────────────────────────
echo.
echo  ============================================================
echo    Update complete!
echo.
echo    Double-click "Swarm Gallery" on your Desktop to start.
echo  ============================================================
echo.
pause
endlocal
