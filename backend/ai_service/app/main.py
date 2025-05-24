import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv

# Add the service directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'service'))

from app.service.parse_resume import ResumeParser

_ = load_dotenv(find_dotenv())


app = FastAPI(title="CV Parser API", description="API for parsing CV/Resume files", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class ParseRequest(BaseModel):
    file_path: str

# Initialize parser
parser = ResumeParser()

@app.get("/")
async def root():
    return {
        "message": "CV Parser API",
        "version": "1.0.0",
        "endpoints": {
            "parse_cv": "/parse-cv",
            "test_cv": "/test-cv"
        }
    }

@app.post("/parse-cv")
async def parse_cv(request: ParseRequest):
    """Parse CV from file path"""
    try:
        # Validate file exists
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

        # Validate it's a PDF
        if not request.file_path.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")

        # Parse the CV
        cv_data = parser.resume_to_json(request.file_path)

        return {
            "status": "success",
            "file_path": request.file_path,
            "data": cv_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing CV: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)