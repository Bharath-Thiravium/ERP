#!/bin/bash

echo "🔄 Restarting Frontend with Proxy Fix..."

# Kill any existing Vite processes
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start frontend with proxy
cd frontend
echo "🚀 Starting frontend on http://localhost:3000"
echo "📡 API calls will be proxied to http://localhost:8000"
npm run dev