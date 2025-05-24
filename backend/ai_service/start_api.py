#!/usr/bin/env python3
"""
Startup script for CV Parser API
"""

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("Starting CV Parser API...")
    print("API Documentation will be available at: http://localhost:8000/docs")
    print("API will be running at: http://localhost:8000")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=True  # Enable auto-reload for development
    )
