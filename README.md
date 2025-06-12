# CV Management System

A full-stack application for managing CVs, update requests, and projects. Built with Next.js, TailwindCSS, Go, and PostgreSQL.

## Quick Start


### Backend
```bash
cd backend/main_service
go mod tidy
cd ../ai_service
python3 -m venv venv
# Linux/macOS:
source venv/bin/activate
# Windows (PowerShell):
# .\venv\Scripts\Activate.ps1
cd ../..
./start_backend.sh
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features
- CV management
- Update request workflow
- User and role management
- Project tracking
- AI-powered CV parsing

## Tech Stack
- Frontend: Next.js, TailwindCSS, shadcn/ui
- Backend: Go (Gin framework) + Python (FastAPI) for AI service
- Database: PostgreSQL

## License
MIT
