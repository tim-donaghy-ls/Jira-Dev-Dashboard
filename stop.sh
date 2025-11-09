#!/bin/bash

# JIRA Dashboard Stop Script
# This script stops both the Go backend and Next.js frontend

echo "🛑 Stopping JIRA Dashboard..."
echo ""

# Function to kill process by PID file
kill_process() {
    local pid_file=$1
    local name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "⏹️  Stopping $name (PID: $pid)..."
            kill "$pid" 2>/dev/null
            sleep 1

            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo "   Force stopping $name..."
                kill -9 "$pid" 2>/dev/null
            fi
            echo "✅ $name stopped"
        else
            echo "ℹ️  $name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  No PID file found for $name"
    fi
}

# Stop processes
kill_process "logs/backend.pid" "Backend"
kill_process "logs/frontend.pid" "Frontend"

echo ""

# Also kill by port (backup method)
echo "🔍 Checking for any remaining processes on ports 3000 and 8080..."

# Kill process on port 3000 (frontend)
FRONTEND_PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$FRONTEND_PORT_PID" ]; then
    echo "⏹️  Stopping process on port 3000..."
    kill -9 $FRONTEND_PORT_PID 2>/dev/null
    echo "✅ Port 3000 cleared"
fi

# Kill process on port 8080 (backend)
BACKEND_PORT_PID=$(lsof -ti:8080 2>/dev/null)
if [ ! -z "$BACKEND_PORT_PID" ]; then
    echo "⏹️  Stopping process on port 8080..."
    kill -9 $BACKEND_PORT_PID 2>/dev/null
    echo "✅ Port 8080 cleared"
fi

# Clean up Next.js lock file
if [ -f "frontend/.next/dev/lock" ]; then
    rm -f "frontend/.next/dev/lock"
    echo "✅ Cleaned up Next.js lock file"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All JIRA Dashboard services stopped"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
