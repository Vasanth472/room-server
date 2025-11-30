@echo off
REM Quick setup and start script for Room Expense Server
REM Run this as Administrator if installing MongoDB as a service

echo.
echo ========================================
echo Room Expense Server Quick Start
echo ========================================
echo.

REM Check if Node is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js installed: %NODE_VERSION%

REM Check if in server folder
if not exist "package.json" (
    echo [ERROR] Please run this script from the server folder
    echo Expected: C:\.ME\Angular\dummy trail\Room.12\server
    pause
    exit /b 1
)

echo [OK] Running from correct folder

REM Install dependencies
echo.
echo [*] Installing npm dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Check if .env exists
if not exist ".env" (
    echo.
    echo [*] Creating .env file from .env.example...
    copy ".env.example" ".env" >nul 2>&1
    echo [OK] .env created. Please edit it with your MongoDB URI if needed.
)

REM Start MongoDB (if available locally)
echo.
echo [*] Attempting to start MongoDB service...
sc query MongoDB >nul 2>&1
if errorlevel 0 (
    net start MongoDB >nul 2>&1
    echo [OK] MongoDB service started
) else (
    echo [!] MongoDB service not found. Ensure MongoDB is running separately:
    echo     - Run: mongod
    echo     - Or start MongoDB service manually
    echo.
)

REM Start the server
echo.
echo [*] Starting server...
echo     Server will listen on http://localhost:3000
echo     Press Ctrl+C to stop
echo.
node index.js

pause
