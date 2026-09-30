@echo off
title SmartLab Tracker - Reset Database
color 0E
echo ====================================================================
echo             SMART LAB TRACKER - RESET & SEED DATABASE
echo ====================================================================
echo.
echo WARNING: This will reset your SQLite database (dev.db) and re-insert
echo default demo users (Admin, Lab Incharge, Students) and chemicals.
echo.
set /p confirm="Are you sure you want to reset the database? (Y/N): "
if /i "%confirm%" neq "Y" (
    echo Reset cancelled.
    pause
    exit /b 0
)

echo.
cd /d "%~dp0server"
echo [1/2] Resetting SQLite Database Schema...
call npx prisma db push --force-reset
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push prisma schema.
    pause
    exit /b 1
)

echo.
echo [2/2] Seeding Database with Default Demo Accounts & Data...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo [ERROR] Failed to seed database.
    pause
    exit /b 1
)

cd /d "%~dp0"
echo.
echo ====================================================================
echo   DATABASE SUCCESSFULLY RESET AND SEEDED!
echo ====================================================================
echo.
pause
