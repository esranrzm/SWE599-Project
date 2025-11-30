from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import logging
import traceback

from app.database import get_db
from app.models import User, BlacklistedToken
from app.schemas import UserRegistration, UserLogin, TokenResponse, UserResponse, ErrorResponse, UserUpdate, PasswordUpdate
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
            photo_url=None,  # Profile picture feature removed - always use default avatar
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
    logger.info(f"Login attempt for username: {credentials.username}")
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
    return UserResponse.model_validate(current_user)


@router.get("/verify-token", status_code=status.HTTP_200_OK)
async def verify_token(current_user: User = Depends(get_current_user)):
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


@router.put("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current authenticated user's profile.
    
    Requires authentication - the user can only update their own profile.
    
    - **email**: Updated email address (must be unique)
    - **username**: Updated username (must be unique)
    - **name**: Updated first name
    - **surname**: Updated last name
    - **profession**: Updated profession
    - **photo_url**: Optional photo URL
    
    Returns the updated user information.
    """
    try:
        # Check if username is being changed and if new username already exists
        if user_data.username != current_user.username:
            existing_username = db.query(User).filter(
                User.username == user_data.username,
                User.id != current_user.id
            ).first()
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )
        
        # Check if email is being changed and if new email already exists
        if user_data.email != current_user.email:
            existing_email = db.query(User).filter(
                User.email == user_data.email,
                User.id != current_user.id
            ).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )
        
        # Update user fields
        current_user.username = user_data.username
        current_user.email = user_data.email
        current_user.name = user_data.name
        current_user.surname = user_data.surname
        current_user.profession = user_data.profession
        # Profile picture feature removed - always set to None
        current_user.photo_url = None
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"User profile updated: {current_user.id}")
        
        return UserResponse.model_validate(current_user)
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"IntegrityError during profile update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username or email already exists",
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the profile: {str(e)}",
        )


@router.put("/me/password", status_code=status.HTTP_200_OK)
async def update_user_password(
    password_data: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current authenticated user's password.
    
    Requires authentication - the user can only update their own password.
    
    - **current_password**: Current password for verification
    - **new_password**: New password (min 6 characters)
    
    After successful password update, the user should logout and login again with the new password.
    """
    try:
        # Verify current password
        if not verify_password(password_data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )
        
        # Check if new password is the same as current password
        if verify_password(password_data.new_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password",
            )
        
        # Hash the new password
        try:
            hashed_password = hash_password(password_data.new_password)
        except Exception as hash_error:
            logger.error(f"Password hashing failed: {hash_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Password hashing failed: {str(hash_error)}",
            )
        
        # Update password
        current_user.hashed_password = hashed_password
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Password updated for user: {current_user.id}")
        
        return {
            "message": "Password updated successfully. Please login again with your new password.",
            "user_id": current_user.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the password: {str(e)}",
        )


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete the current authenticated user's account.
    
    Requires authentication - the user can only delete their own account.
    
    This will permanently delete the user account and all associated data.
    The user will need to logout after deletion.
    
    Returns a success message.
    """
    try:
        user_id = current_user.id
        username = current_user.username
        
        # Delete the user (this will cascade delete related data if foreign keys are set up)
        db.delete(current_user)
        db.commit()
        
        logger.info(f"User account deleted: {user_id} (username: {username})")
        
        return {
            "message": "User account deleted successfully",
            "user_id": user_id
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the account: {str(e)}",
        )

