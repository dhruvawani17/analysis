#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() { kill $(jobs -p) 2>/dev/null; exit; }
trap cleanup SIGINT SIGTERM

echo "Starting backend on :8000..."
(cd "$DIR/backend" && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BE_PID=$!

echo "Starting frontend on :3000..."
(cd "$DIR" && npx next dev --port 3000) &
FE_PID=$!

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop"
wait $BE_PID $FE_PID
