from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import logging
import traceback

from app.database import get_db
from app.models import User, BlacklistedToken
from app.schemas import UserRegistration, UserLogin, TokenResponse, UserResponse, ErrorResponse
from app.utils import verify_password, hash_password, create_access_token, decode_access_token
from app.dependencies import get_current_user
from datetime import datetime
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegistration, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    - **email**: User's email address (must be unique)
    - **username**: User's username (must be unique)
    - **name**: User's first name
    - **surname**: User's last name
    - **password**: User's password (will be hashed)
    - **profession**: User's profession
    - **date_of_birth**: User's date of birth
    - **photo**: Optional photo URL
    - **consent**: User consent agreement
    
    Returns JWT token and user information on successful registration.
    """
    try:
        # Check if username already exists
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        
        # Check if email already exists
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Hash the password
        try:
            logger.info(f"Attempting to hash password for user: {user_data.username}")
            hashed_password = hash_password(user_data.password)
            logger.info("Password hashed successfully")
        except Exception as hash_error:
            logger.error(f"Password hashing failed: {hash_error}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Password hashing failed: {str(hash_error)}",
            )
        
        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            name=user_data.name,
            surname=user_data.surname,
            hashed_password=hashed_password,
            profession=user_data.profession,
            date_of_birth=user_data.dateOfBirth,  # Map from camelCase to snake_case
            photo_url=user_data.photo,
            consent=user_data.consent
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create access token
        access_token = create_access_token(data={"sub": new_user.username, "user_id": new_user.id})
        
        # Return token and user data
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(new_user)
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"IntegrityError during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username or email already exists",
        )
    except Exception as e:
        db.rollback()
        error_traceback = traceback.format_exc()
        logger.error(f"Error during registration: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        # Return detailed error for debugging (remove in production)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {str(e)}",
        )

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user and return a JWT token.
    
    - **username**: User's username
    - **password**: User's password
    
    Returns JWT token and user information on successful authentication.
    """
    try:
        # Find user by username
        user = db.query(User).filter(User.username == credentials.username).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        
        # Verify password
        if not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
        
        # Return token and user data
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during login: {str(e)}",
        )


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get the current authenticated user's information.
    
    This endpoint requires authentication - the user must provide a valid JWT token
    in the Authorization header.
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        Current user's information
    """
    return UserResponse.model_validate(current_user)


@router.get("/verify-token", status_code=status.HTTP_200_OK)
async def verify_token(current_user: User = Depends(get_current_user)):
    """
    Verify if the provided JWT token is valid.
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        Status indicating token is valid and user information
    """
    return {
        "valid": True,
        "message": "Token is valid",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
        }
    }


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
):
    """
    Logout the current user by blacklisting their token.
    
    This endpoint requires authentication - the user must provide a valid JWT token.
    Once logged out, the token cannot be used again until it expires.
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        Success message indicating logout was successful
    """
    token = credentials.credentials
    
    # Decode token to get expiration time
    payload = decode_access_token(token, check_expiration=False)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get expiration time from token
    expires_at = datetime.utcfromtimestamp(payload.get("exp", 0))
    
    # Check if token is already blacklisted
    existing = db.query(BlacklistedToken).filter(BlacklistedToken.token == token).first()
    if existing:
        # Already logged out
        return {
            "message": "You are already logged out",
            "logged_out": True
        }
    
    # Add token to blacklist
    blacklisted_token = BlacklistedToken(
        token=token,
        expires_at=expires_at
    )
    
    db.add(blacklisted_token)
    db.commit()
    
    logger.info(f"Token blacklisted for user logout")
    
    return {
        "message": "Successfully logged out",
        "logged_out": True
    }

