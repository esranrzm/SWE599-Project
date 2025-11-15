from datetime import datetime, timedelta
from typing import Optional
import jwt
from jwt.exceptions import InvalidTokenError
import bcrypt
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "1"))

if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")


# ------------------------
# Password Hashing Utilities
# ------------------------

def hash_password(password: str) -> str:
    """
    Hash a plain password using bcrypt (with automatic salt).
    Returns the hashed password as a string (to store in DB).
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    password_bytes = password.encode('utf-8')
    hashed_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Returns True if matched, False otherwise.
    """
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# ------------------------
# JWT Token Utilities
# ------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing the data to encode in the token (user ID, username, etc.)
        expires_delta: Optional timedelta for token expiration. Defaults to ACCESS_TOKEN_EXPIRE_HOURS.

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str, check_expiration: bool = True) -> Optional[dict]:
    """
    Decode and verify a JWT access token.

    Args:
        token: The JWT token string to decode
        check_expiration: Whether to check token expiration (default: True)

    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        if check_expiration:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        else:
            # Decode without verifying expiration (for extracting exp from blacklisted tokens)
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        return payload
    except InvalidTokenError:
        return None


def get_current_user_id(token: str) -> Optional[int]:
    """
    Extract user ID from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User ID if token is valid, None otherwise
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("user_id")
    return None


def get_current_username(token: str) -> Optional[str]:
    """
    Extract username from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Username if token is valid, None otherwise
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")  # 'sub' is the standard JWT claim for subject (username)
    return None
