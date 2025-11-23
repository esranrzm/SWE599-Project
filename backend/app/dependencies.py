"""
Dependencies for FastAPI routes to handle authentication and authorization.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, BlacklistedToken
from app.utils import decode_access_token, get_current_user_id
from datetime import datetime

# HTTPBearer security scheme for extracting token from Authorization header
security = HTTPBearer()


def is_token_blacklisted(token: str, db: Session) -> bool:
    """
    Check if a token is blacklisted.
    
    Args:
        token: JWT token string
        db: Database session
        
    Returns:
        True if token is blacklisted, False otherwise
    """
    # Check if token exists in blacklist
    blacklisted = db.query(BlacklistedToken).filter(BlacklistedToken.token == token).first()
    if blacklisted:
        # Also check if the blacklisted token has expired (cleanup)
        if blacklisted.expires_at < datetime.utcnow():
            db.delete(blacklisted)
            db.commit()
            return False
        return True
    return False


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    This can be used in route handlers to require authentication:
    
    @router.get("/protected")
    async def protected_route(current_user: User = Depends(get_current_user)):
        return {"message": f"Hello {current_user.username}"}
    
    Args:
        credentials: HTTPBearer credentials containing the token
        db: Database session
        
    Returns:
        User object of the authenticated user
        
    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    token = credentials.credentials
    
    # Check if token is blacklisted (logged out)
    if is_token_blacklisted(token, db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decode and verify token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user_id from token
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain user information",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> User | None:
    """
    Dependency to get the current authenticated user (optional).
    
    Unlike get_current_user, this doesn't raise an error if no token is provided.
    Useful for routes that work both with and without authentication.
    
    Args:
        credentials: HTTPBearer credentials (may be None)
        db: Database session
        
    Returns:
        User object if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = payload.get("user_id")
    if not user_id:
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    return user

