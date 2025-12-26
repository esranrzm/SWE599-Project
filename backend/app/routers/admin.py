from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import logging

from app.database import get_db
from app.models import User, Community, CommunityTab, InputContribution
from app.schemas import UserResponse, CommunityResponse
from app.dependencies import get_current_user

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def is_admin_user(user: User) -> bool:
    """Check if user is admin"""
    return user.username == "admin"


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        total_communities = db.query(func.count(Community.id)).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_tabs = db.query(func.count(CommunityTab.id)).scalar() or 0
        
        return {
            "total_communities": total_communities,
            "total_users": total_users,
            "total_tabs": total_tabs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving stats: {str(e)}",
        )


@router.get("/communities", response_model=List[CommunityResponse], status_code=status.HTTP_200_OK)
async def get_all_communities_admin(
    skip: int = 0,
    limit: int = 1000,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        from sqlalchemy.orm import joinedload
        
        communities = db.query(Community)\
            .options(joinedload(Community.tabs))\
            .join(User, Community.creator_id == User.id)\
            .order_by(Community.created_at.desc(), User.username.asc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        result = []
        for community in communities:
            creator_user = db.query(User).filter(User.id == community.creator_id).first()
            community_dict = {
                "id": community.id,
                "title": community.title,
                "description": community.description,
                "creator_id": community.creator_id,
                "creator_name": community.creator_name,
                "creator_username": creator_user.username if creator_user else None,
                "creator_email": creator_user.email if creator_user else None,
                "tabs": community.tabs,
                "created_at": community.created_at,
                "updated_at": community.updated_at,
            }
            result.append(CommunityResponse.model_validate(community_dict))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all communities for admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving communities: {str(e)}",
        )


@router.get("/users", response_model=List[UserResponse], status_code=status.HTTP_200_OK)
async def get_all_users_admin(
    skip: int = 0,
    limit: int = 1000,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        users = db.query(User)\
            .order_by(User.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return [UserResponse.model_validate(user) for user in users]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all users for admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving users: {str(e)}",
        )


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user_admin(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        # Delete the user (communities and inputs remain due to foreign key constraints)
        db.delete(user)
        db.commit()
        
        logger.info(f"User deleted by admin: {user_id} (username: {user.username})")
        
        return {
            "message": "User deleted successfully",
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the user: {str(e)}",
        )


@router.get("/tabs", status_code=status.HTTP_200_OK)
async def get_all_tabs_admin(
    skip: int = 0,
    limit: int = 1000,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        from sqlalchemy.orm import joinedload
        
        tabs = db.query(CommunityTab)\
            .options(joinedload(CommunityTab.community))\
            .order_by(CommunityTab.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        result = []
        for tab in tabs:
            # Count input contributions for this tab
            input_count = db.query(func.count(InputContribution.id))\
                .filter(InputContribution.tab_id == tab.id)\
                .scalar() or 0
            
            result.append({
                "id": tab.id,
                "name": tab.name,
                "community_id": tab.community_id,
                "community_title": tab.community.title if tab.community else None,
                "input_count": input_count,
                "created_at": tab.created_at
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all tabs for admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving tabs: {str(e)}",
        )

