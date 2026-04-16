#!/bin/bash

echo "========================================"
echo "  Lead Distribution System - Startup"
echo "========================================"
echo ""

echo "Starting Backend Server..."
cd Backend
npm start &
BACKEND_PID=$!

sleep 3

echo ""
echo "Starting Frontend Server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  Servers Starting..."
echo "========================================"
echo ""
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Login at: http://localhost:3000/login"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
