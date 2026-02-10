@echo off
cls
echo ===============================================
echo    SCENT STOCK MANAGER - Starting System
echo ===============================================
echo.
echo IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP:~1%
echo.
echo IP: %IP%
echo.
echo 1. : http://localhost:5173
echo 2. : http://%IP%:5173
echo.
echo ===============================================
echo.
echo install...
call npm install --silent
echo.
echo Starting System...
echo.
call npm run dev
pause
