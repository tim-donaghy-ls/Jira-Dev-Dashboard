#!/bin/bash

# JIRA Dashboard Unified Startup Script
# This script starts both the Go backend and Next.js frontend

echo "🚀 Starting JIRA Dashboard..."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please copy .env.example to .env and configure your credentials:"
    echo "   cp .env.example .env"
    echo ""
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Copy .env to backend and frontend directories
cp .env backend/.env
cp .env frontend/.env.local

echo "✅ Environment variables loaded and distributed"
echo ""

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Error: Go is not installed!"
    echo "📥 Please install Go from: https://golang.org/dl/"
    echo ""
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "📥 Please install Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✅ Go and Node.js are installed"
echo ""

# Check if backend dependencies are installed
if [ ! -f "backend/go.mod" ]; then
    echo "❌ Error: Backend go.mod not found!"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
    echo ""
fi

# Create log directory
mkdir -p logs

# Start the Go backend
echo "🔧 Starting Go backend on port ${SERVER_PORT:-8080}..."
cd backend
go run main.go > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to be ready..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check logs/backend.log for details"
    exit 1
fi

echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Start the Next.js frontend
echo "⚛️  Starting Next.js frontend on port 3000..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to be ready..."
sleep 5

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start. Check logs/frontend.log for details"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

# Save PIDs for cleanup
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ JIRA Dashboard is now running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:${SERVER_PORT:-8080}"
echo ""
echo "📊 Open your browser to: http://localhost:3000"
echo ""
echo "📝 Logs are available in the logs/ directory:"
echo "   - logs/backend.log"
echo "   - logs/frontend.log"
echo ""
echo "🛑 To stop the servers, run: ./stop.sh"
echo "   Or press Ctrl+C and run: ./stop.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to open the browser
if command -v open &> /dev/null; then
    # macOS
    sleep 2
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    # Linux
    sleep 2
    xdg-open http://localhost:3000
fi

# Keep script running
echo ""
echo "Press Ctrl+C to stop monitoring (servers will continue running in background)"
echo "Use ./stop.sh to stop all services"
echo ""

# Monitor the processes
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "⚠️  Backend process died! Check logs/backend.log"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "⚠️  Frontend process died! Check logs/frontend.log"
        break
    fi
    sleep 5
done
