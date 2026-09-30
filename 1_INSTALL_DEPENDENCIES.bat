@echo off
title SmartLab Tracker - Setup & Installation
echo ====================================================================
echo             SMART LAB TRACKER - INSTALLATION WIZARD
echo ====================================================================
echo.

echo [1/5] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is NOT installed or not found in system PATH!
    echo.
    echo Please install Node.js (LTS version) on this laptop:
    echo 👉 Download from: https://nodejs.org/
    echo.
    echo After installing Node.js, restart this script.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo [OK] Node.js Version: %NODE_VER% (npm: %NPM_VER%)
echo.

echo [2/5] Checking Environment Configuration (.env files)...
if not exist "%~dp0server\.env" (
    echo Creating server\.env from template...
    copy "%~dp0server\.env.example" "%~dp0server\.env" >nul
)
if not exist "%~dp0client\.env" (
    echo Creating client\.env from template...
    copy "%~dp0client\.env.example" "%~dp0client\.env" >nul
)
echo [OK] Environment files verified.
echo.

echo [3/5] Installing Root Workspace Dependencies...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] Root npm install returned non-zero code. Continuing...
)
echo.

echo [4/5] Installing Backend Server Dependencies & Generating Prisma Client...
cd /d "%~dp0server"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install server dependencies.
    pause
    exit /b 1
)
echo Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma Client.
    pause
    exit /b 1
)
echo.

echo [5/5] Installing Frontend Web Client Dependencies...
cd /d "%~dp0client"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install client dependencies.
    pause
    exit /b 1
)
echo.

cd /d "%~dp0"
echo ====================================================================
echo   SETUP COMPLETED SUCCESSFULLY!
echo.
echo   All dependencies and Prisma SQLite client are ready.
echo   Now you can double-click "2_START_PROJECT.bat" to run the project.
echo ====================================================================
echo.
pause
