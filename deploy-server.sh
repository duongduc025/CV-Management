#!/bin/bash

# CV Management System Production Deployment Script
# For server IP: 167.71.199.165

set -e

echo "🚀 CV Management System Production Deployment"
echo "=============================================="
echo "Server IP: 167.71.199.165"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create production environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating production .env file..."
    cp .env.production .env
    echo "⚠️  Please edit .env file and configure your Azure OpenAI credentials before running the application."
    echo "   Required variables:"
    echo "   - AZURE_OPENAI_API_KEY"
    echo "   - AZURE_OPENAI_ENDPOINT"
    echo "   - AZURE_OPENAI_DEPLOYMENT_NAME"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p uploads
fi

# Stop any existing services
echo "🛑 Stopping existing services..."
docker-compose down 2>/dev/null || true

# Pull latest images and build
echo "🏗️  Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
echo ""

# Check if Caddy is running
if docker ps | grep -q "cv-management-caddy"; then
    echo "✅ Caddy (Load Balancer): Running"
else
    echo "❌ Caddy (Load Balancer): Not running"
fi

# Check if backend services are running
for i in {1..3}; do
    if docker ps | grep -q "cv-management-app$i"; then
        echo "✅ Backend Service $i: Running"
    else
        echo "❌ Backend Service $i: Not running"
    fi
done

# Check if frontend is running
if docker ps | grep -q "cv-management-frontend"; then
    echo "✅ Frontend: Running"
else
    echo "❌ Frontend: Not running"
fi

# Check if AI service is running
if docker ps | grep -q "cv-management-ai"; then
    echo "✅ AI Service: Running"
else
    echo "❌ AI Service: Not running"
fi

# Check if database is running
if docker ps | grep -q "cv-management-db"; then
    echo "✅ Database: Running"
else
    echo "❌ Database: Not running"
fi

echo ""
echo "🌐 Application URLs:"
echo "   Frontend:         http://167.71.199.165:3000"
echo "   Load Balanced API: http://167.71.199.165/api"
echo "   AI Service API:   http://167.71.199.165:8000"
echo "   AI Service Docs:  http://167.71.199.165:8000/docs"
echo ""
echo "📊 Useful commands:"
echo "   View all logs:     docker-compose logs -f"
echo "   View specific logs: docker-compose logs -f [service-name]"
echo "   Stop services:     docker-compose down"
echo "   Restart services:  docker-compose restart"
echo ""
echo "🔧 Service names: postgres, app1, app2, app3, caddy, ai-service, frontend"
echo ""

# Test API endpoint
echo "🧪 Testing API endpoint..."
if curl -s -f http://167.71.199.165/api/health > /dev/null; then
    echo "✅ API endpoint is responding"
else
    echo "⚠️  API endpoint test failed - services may still be starting"
    echo "   Wait a few more minutes and try: curl http://167.71.199.165/api/health"
fi

echo ""
echo "✅ Deployment completed!"
echo "🎉 Your CV Management System is now running on server 167.71.199.165"
