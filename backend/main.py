from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routers import auth
from app.database import engine, Base

# Load environment variables
load_dotenv()

# Import models to ensure they're registered with Base
from app.models import User, BlacklistedToken  # noqa: F401

# Create database tables automatically when the app starts
# Note: The DATABASE must exist in PostgreSQL first (create it manually or use scripts/create_database.py)
# This line only creates the TABLES within the existing database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SWE599 Project API", version="1.0.0")

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

@app.get("/")
def root():
    return {"message": "SWE599 Project API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

