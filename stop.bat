@echo off
REM JIRA Dashboard Stop Script for Windows
REM This script stops both the Go backend and Next.js frontend

echo.
echo ========================================
echo   Stopping JIRA Dashboard
echo ========================================
echo.

REM Kill processes on port 8080 (backend)
echo Stopping backend on port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Backend stopped

REM Kill processes on port 3000 (frontend)
echo Stopping frontend on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Frontend stopped

REM Clean up Next.js lock file
if exist frontend\.next\dev\lock (
    del /F /Q frontend\.next\dev\lock
    echo [OK] Cleaned up Next.js lock file
)

echo.
echo ========================================
echo   All services stopped
echo ========================================
echo.
pause
