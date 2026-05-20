@echo off
title Lakbayan Dev Servers
echo ========================================
echo   Lakbayan sa Kitcharao - Dev Servers
echo ========================================
echo.
echo Starting Backend (port 5000)...
start "Lakbayan Backend" cmd /k "cd /d %~dp0 && node server/index.js"
echo Starting Frontend (port 5173)...
timeout /t 2 >nul
start "Lakbayan Frontend" cmd /k "cd /d %~dp0\client && npx vite --host"
echo.
echo ========================================
echo   Backend:  http://localhost:5000/api
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Both servers started in separate windows.
echo Close this window or press any key to exit.
pause >nul
