#!/bin/bash

# CV Management System Docker Startup Script

set -e

echo "🚀 CV Management System Docker Setup"
echo "===================================="

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

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
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

# Function to show menu
show_menu() {
    echo ""
    echo "Select action:"
    echo "1) Start services"
    echo "2) Stop services"
    echo "3) View logs"
    echo "4) Reset everything (⚠️  WARNING: This will delete all data)"
    echo "5) Exit"
    echo ""
}

# Function to start services
start_services() {
    echo "🏭 Starting services..."
    docker-compose up -d --build
    echo ""
    echo "✅ Services started successfully!"
    show_urls
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping all services..."
    docker-compose down
    echo "✅ All services stopped!"
}

# Function to view logs
view_logs() {
    echo "📋 Available services: frontend, backend, ai-service, postgres"
    read -p "Enter service name (or press Enter for all): " service

    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$service"
    fi
}

# Function to reset everything
reset_everything() {
    echo "⚠️  WARNING: This will delete all data including database!"
    read -p "Are you sure? Type 'yes' to continue: " confirm

    if [ "$confirm" = "yes" ]; then
        echo "🗑️  Resetting everything..."
        docker-compose down -v --rmi all 2>/dev/null || true
        echo "✅ Everything reset!"
    else
        echo "❌ Reset cancelled."
    fi
}

# Function to show URLs
show_urls() {
    echo "🌐 Application URLs:"
    echo "   Frontend:        http://167.71.199.165:3000"
    echo "   Load Balanced API: http://167.71.199.165/api"
    echo "   AI Service API:  http://167.71.199.165:8000"
    echo "   AI Service Docs: http://167.71.199.165:8000/docs"
    echo ""
    echo "📊 To view logs: docker-compose logs -f [service-name]"
    echo "🛑 To stop: docker-compose down"
}

# Main menu loop
while true; do
    show_menu
    read -p "Enter your choice (1-5): " choice

    case $choice in
        1)
            start_services
            ;;
        2)
            stop_services
            ;;
        3)
            view_logs
            ;;
        4)
            reset_everything
            ;;
        5)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid option. Please choose 1-5."
            ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
done
