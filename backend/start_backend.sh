#!/bin/bash

echo "Khởi động Backend Services..."

cd main_service
go run cmd/main.go &
MAIN_SERVICE_PID=$!

cd ../ai_service
conda run -n inmentor uvicorn app.main:app --host 0.0.0.0 --port 8000 &
AI_SERVICE_PID=$!

echo "Backend Services đã khởi động!"
echo "Main Service API: http://localhost:8080"
echo "AI Service API: http://localhost:8000"
echo ""
echo "Nhấn Ctrl+C để dừng tất cả services"

cleanup() {
    echo "Dừng services..."
    kill $MAIN_SERVICE_PID
    kill $AI_SERVICE_PID
    echo "Services đã dừng."
    exit 0
}

trap cleanup SIGINT

wait