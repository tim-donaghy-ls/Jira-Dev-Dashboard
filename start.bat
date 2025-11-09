@echo off
REM JIRA Dashboard Unified Startup Script for Windows
REM This script starts both the Go backend and Next.js frontend

echo.
echo ========================================
echo   JIRA Dashboard Startup
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please copy .env.example to .env and configure your credentials:
    echo    copy .env.example .env
    echo.
    pause
    exit /b 1
)

echo [OK] Environment file found
echo.

REM Check if Go is installed
where go >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Go is not installed!
    echo Please install Go from: https://golang.org/dl/
    echo.
    pause
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Go and Node.js are installed
echo.

REM Check if frontend dependencies are installed
if not exist frontend\node_modules (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend dependencies installed
    echo.
)

REM Create logs directory
if not exist logs mkdir logs

REM Start the Go backend
echo Starting Go backend...
cd backend
start /B go run main.go > ..\logs\backend.log 2>&1
cd ..
timeout /t 3 /nobreak >nul
echo [OK] Backend started
echo.

REM Start the Next.js frontend
echo Starting Next.js frontend...
cd frontend
start /B npm run dev > ..\logs\frontend.log 2>&1
cd ..
timeout /t 5 /nobreak >nul
echo [OK] Frontend started
echo.

echo ========================================
echo   JIRA Dashboard is now running!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8080
echo.
echo Open your browser to: http://localhost:3000
echo.
echo Logs are available in the logs\ directory
echo.
echo To stop the servers, run: stop.bat
echo ========================================
echo.

REM Open browser
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo Press any key to exit (servers will continue running)...
pause >nul
