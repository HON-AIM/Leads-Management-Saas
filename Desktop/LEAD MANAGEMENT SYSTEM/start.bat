@echo off
echo ========================================
echo   Lead Distribution System - Startup
echo ========================================
echo.

echo Starting Backend Server...
cd Backend
start "Backend Server" cmd /k "npm start"

timeout /t 3 /nobreak > nul

echo.
echo Starting Frontend Server...
cd ../frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Login at: http://localhost:3000/login
echo.
pause
