@echo off
title SmartLab Tracker - Launcher
color 0A
echo ====================================================================
echo                 SMART LAB TRACKER - SYSTEM LAUNCHER
echo ====================================================================
echo.

echo [1/3] Launching Embedded MQTT Broker (TCP Port 1883)...
start "[SmartLab] 1. Embedded MQTT Broker (Port 1883)" cmd /k "cd /d "%~dp0server" && npm run broker"

timeout /t 2 /nobreak >nul

echo [2/3] Launching Backend API Server (HTTP Port 5000)...
start "[SmartLab] 2. Backend Server (Port 5000)" cmd /k "cd /d "%~dp0server" && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Launching Frontend Web Client (Vite Port 5173)...
start "[SmartLab] 3. Frontend Client (Port 5173)" cmd /k "cd /d "%~dp0client" && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo Opening SmartLab Tracker Web Dashboard in your default browser...
start http://localhost:5173

echo.
echo ====================================================================
echo                 ALL SERVICES ARE NOW RUNNING!
echo ====================================================================
echo   - Frontend Web UI:    http://localhost:5173
echo   - Backend API Server: http://localhost:5000
echo   - MQTT Broker:        tcp://localhost:1883
echo.
echo   🔑 DEFAULT LOGIN CREDENTIALS:
echo   --------------------------------------------------------------
echo   * Admin:        admin@smartlab.com    / password: admin123
echo   * Lab Incharge: incharge@smartlab.com / password: incharge123
echo   * Student 1:    23-ES-020             / password: student123
echo   * Student 2:    21-CS-45              / password: student123
echo   --------------------------------------------------------------
echo.
echo   NOTE: Please keep the 3 opened terminal windows RUNNING in the
echo         background while using the website. To stop the system,
echo         simply close those 3 terminal windows.
echo ====================================================================
echo.
pause
