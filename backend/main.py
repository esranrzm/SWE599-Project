from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
import os
import logging
import time

from app.routers import auth, communities
from app.database import engine, Base

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.models import User, BlacklistedToken, Community

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SWE599 Project API", version="1.0.0")

env_origins = os.getenv("CORS_ORIGINS", "")

if env_origins:
    cors_origins = [origin.strip() for origin in env_origins.split(",")]
    cors_kwargs = {
        "allow_origins": cors_origins,
        "allow_credentials": True,
    }
    logger.info(f"CORS configured with specific origins: {cors_origins}")
else:
    cors_kwargs = {
        "allow_origin_regex": r".*",  # Matches all origins
        "allow_credentials": True,
    }
    logger.info("CORS configured to allow all origins (development mode)")

app.add_middleware(
    CORSMiddleware,
    **cors_kwargs,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Request logging middleware
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        logger.info(f"=== Incoming request: {request.method} {request.url.path} ===")
        logger.info(f"Query params: {dict(request.query_params)}")
        logger.info(f"Client: {request.client.host if request.client else 'unknown'}:{request.client.port if request.client else 'unknown'}")
        logger.info(f"Origin: {request.headers.get('origin', 'No origin header')}")
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        logger.info(f"=== Response: {response.status_code} - Process time: {process_time:.3f}s ===")
        logger.info(f"CORS headers in response: Access-Control-Allow-Origin = {response.headers.get('access-control-allow-origin', 'Not set')}")
        
        return response

# Add logging middleware after CORS
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(communities.router, prefix="/api/communities", tags=["communities"])

@app.get("/")
def root():
    return {"message": "SWE599 Project API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

