from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env file - try to load from backend directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    error_msg = (
        "DATABASE_URL environment variable is not set.\n\n"
        "Please create a .env file in the backend directory with:\n"
        "DATABASE_URL=postgresql://username:password@localhost:5432/dbname\n\n"
        "You can use: python check_env.py to create it automatically,\n"
        "or run: create_env.bat (Windows)"
    )
    raise ValueError(error_msg)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Database dependency for FastAPI routes.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

