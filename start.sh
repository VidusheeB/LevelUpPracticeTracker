#!/bin/bash
# =============================================================================
# PracticeBeats - One-Click Start Script
# =============================================================================
# Starts both backend and frontend, then opens the browser

cd "$(dirname "$0")"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          🎵 Starting PracticeBeats Application 🎵            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Kill any existing processes on our ports
echo "Cleaning up old processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend
echo "📡 Starting backend server..."
cd backend
python -m uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

# Open browser
echo "🌐 Opening browser..."
open http://localhost:5173 2>/dev/null || echo "Please open http://localhost:5173 in your browser"

echo ""
echo "============================================"
echo "  ✓ PracticeBeats is running!"
echo "  🌐 Frontend: http://localhost:5173"
echo "  📡 Backend:  http://localhost:8000"
echo "  📚 API Docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "============================================"
echo ""

# Wait for Ctrl+C and cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'PracticeBeats stopped'; exit" INT
wait
