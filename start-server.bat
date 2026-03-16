@echo off
echo ========================================
echo CricketLive Pro - Backend Server
echo ========================================
echo.

echo Starting Node.js Express server...
cd backend
start "CricketLive Pro - Express" node server.js
timeout /t 2 /nobreak >nul

echo Starting Python Flask server...
cd backend
start "CricketLive Pro - Flask" python server.py
timeout /t 2 /nobreak >nul

echo.
echo Servers started!
echo.
echo Express Server: http://localhost:3000
echo Flask Server:   http://localhost:5000
echo.
echo Press any key to open the app in your browser...
pause >nul
start http://localhost:3000
