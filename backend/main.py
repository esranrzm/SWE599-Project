from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
import os
import logging
import time

from app.routers import auth, communities, admin
from app.database import engine, Base

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.models import User, BlacklistedToken, Community, CommunityTab, InputContribution 

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SWE599 Project API", version="1.0.0")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        logger.info(f"=== Incoming request: {request.method} {request.url.path} ===")
        logger.info(f"Query params: {dict(request.query_params)}")
        logger.info(f"Client: {request.client.host if request.client else 'unknown'}:{request.client.port if request.client else 'unknown'}")
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        logger.info(f"=== Response: {response.status_code} - Process time: {process_time:.3f}s ===")
        
        return response

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware (must be after CORS)
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(communities.router, prefix="/api/communities", tags=["communities"])
app.include_router(admin.router, prefix="/api", tags=["admin"])

@app.get("/")
def root():
    return {"message": "SWE599 Project API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

