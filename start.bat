@echo off
echo ========================================
echo   Lead Distribution System - Startup
echo ========================================
echo.

echo Starting Redis and Backend Server...
start "Lead Distribution Backend" cmd /k "npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
cd frontend
start "Lead Distribution Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Login at: http://localhost:3000/login
echo.
pause
