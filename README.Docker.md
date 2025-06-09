# Docker Setup for CV Management System

This document provides instructions for running the CV Management System using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Git

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd CV-Management
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Edit the `.env` file and configure the following variables:
- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Your deployment name
- `JWT_SECRET`: Change to a secure secret key for production

### 3. Run the application
```bash
# Using the helper script
./docker-start.sh

# Or directly with docker-compose
docker-compose up -d
```

### 4. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- AI Service API: http://localhost:8000
- AI Service Docs: http://localhost:8000/docs

## Services

### Frontend (Next.js)
- **Port**: 3000
- **Container**: cv-management-frontend
- **Dockerfile**: `frontend/Dockerfile`

### Backend (Go)
- **Port**: 8080
- **Container**: cv-management-backend
- **Dockerfile**: `backend/main_service/Dockerfile`

### AI Service (Python FastAPI)
- **Port**: 8000
- **Container**: cv-management-ai
- **Dockerfile**: `backend/ai_service/Dockerfile`

### Database (PostgreSQL)
- **Port**: 5432
- **Container**: cv-management-db
- **Image**: postgres:15-alpine

## Database

The database is automatically initialized with:
- Schema from `backend/main_service/internal/database/schema.sql`
- Mock data from `backend/main_service/scripts/insert_mock_data.sql`

### Database Access
```bash
# Connect to database
docker exec -it cv-management-db psql -U postgres -d cv_management

# Backup database
docker exec cv-management-db pg_dump -U postgres cv_management > backup.sql

# Restore database
docker exec -i cv-management-db psql -U postgres cv_management < backup.sql
```

## File Structure

```
CV-Management/
├── docker-compose.yml          # Main orchestration file
├── .env.example               # Environment variables template
├── docker-start.sh            # Helper script
├── frontend/
│   ├── Dockerfile            # Frontend container
│   └── ...
├── backend/
│   ├── main_service/
│   │   ├── Dockerfile        # Backend container
│   │   └── ...
│   └── ai_service/
│       ├── Dockerfile        # AI service container
│       ├── requirements.txt  # Python dependencies
│       └── ...
└── uploads/                  # Shared volume for file uploads
```

## Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild and start
docker-compose up --build -d

# Reset everything (⚠️ deletes all data)
docker-compose down -v --rmi all
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 8000, 8080, and 5432 are not in use
2. **Permission issues**: Ensure Docker has permission to access the project directory
3. **Environment variables**: Check that all required environment variables are set in `.env`

### Check Service Health
```bash
# Check if all services are running
docker-compose ps

# Check specific service logs
docker-compose logs backend
```
