from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.models import Community, User
from app.schemas import CommunityCreate, CommunityResponse, CommunityUpdate
from app.dependencies import get_current_user

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
async def create_community(
    community_data: CommunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get creator's full name
        creator_name = f"{current_user.name} {current_user.surname}".strip()
        
        # Create new community
        new_community = Community(
            title=community_data.title,
            description=community_data.description,
            creator_id=current_user.id,
            creator_name=creator_name
        )
        
        db.add(new_community)
        db.commit()
        db.refresh(new_community)
        
        logger.info(f"Community created: {new_community.id} by user {current_user.id}")
        
        return CommunityResponse.model_validate(new_community)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating community: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the community: {str(e)}",
        )


@router.get("/", response_model=List[CommunityResponse], status_code=status.HTTP_200_OK)
async def get_all_communities(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all communities with pagination support.
    
    - **skip**: Number of communities to skip (for pagination, default: 0)
    - **limit**: Maximum number of communities to return (default: 100, max: 1000)
    
    Returns a list of communities ordered by creation date (newest first).
    """
    try:
        # Limit the maximum results to prevent abuse
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        communities = db.query(Community)\
            .order_by(Community.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return [CommunityResponse.model_validate(community) for community in communities]
        
    except Exception as e:
        logger.error(f"Error retrieving communities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving communities: {str(e)}",
        )


@router.get("/me/created", response_model=List[CommunityResponse], status_code=status.HTTP_200_OK)
async def get_my_communities(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all communities created by the current authenticated user.
    
    Requires authentication.
    
    - **skip**: Number of communities to skip (for pagination, default: 0)
    - **limit**: Maximum number of communities to return (default: 100, max: 1000)
    
    Returns a list of communities created by the current user, ordered by creation date (newest first).
    """
    try:
        # Limit the maximum results to prevent abuse
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        communities = db.query(Community)\
            .filter(Community.creator_id == current_user.id)\
            .order_by(Community.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return [CommunityResponse.model_validate(community) for community in communities]
        
    except Exception as e:
        logger.error(f"Error retrieving user's communities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving your communities: {str(e)}",
        )


@router.get("/me/others", response_model=List[CommunityResponse], status_code=status.HTTP_200_OK)
async def get_others_communities(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all communities created by other users (not the current user).
    
    Requires authentication.
    
    - **skip**: Number of communities to skip (for pagination, default: 0)
    - **limit**: Maximum number of communities to return (default: 100, max: 1000)
    
    Returns a list of communities created by other users, ordered by creation date (newest first).
    """
    try:
        # Limit the maximum results to prevent abuse
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        communities = db.query(Community)\
            .filter(Community.creator_id != current_user.id)\
            .order_by(Community.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return [CommunityResponse.model_validate(community) for community in communities]
        
    except Exception as e:
        logger.error(f"Error retrieving others' communities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving others' communities: {str(e)}",
        )


@router.get("/{community_id}", response_model=CommunityResponse, status_code=status.HTTP_200_OK)
async def get_community_by_id(
    community_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a community by its ID.
    
    - **community_id**: The ID of the community to retrieve
    
    Returns the community information if found.
    """
    try:
        community = db.query(Community).filter(Community.id == community_id).first()
        
        if not community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community with ID {community_id} not found",
            )
        
        return CommunityResponse.model_validate(community)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving community {community_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving the community: {str(e)}",
        )


@router.put("/{community_id}", response_model=CommunityResponse, status_code=status.HTTP_200_OK)
async def update_community(
    community_id: int,
    community_data: CommunityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a community by its ID.
    
    Requires authentication - only the creator can update their community.
    
    - **community_id**: The ID of the community to update
    - **title**: Updated community title (max 200 characters)
    - **description**: Updated community description (max 500 characters)
    
    Returns the updated community information.
    """
    try:
        community = db.query(Community).filter(Community.id == community_id).first()
        
        if not community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community with ID {community_id} not found",
            )
        
        # Check if the current user is the creator
        if community.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this community. Only the creator can update it.",
            )
        
        # Update community fields
        community.title = community_data.title
        community.description = community_data.description
        
        db.commit()
        db.refresh(community)
        
        logger.info(f"Community updated: {community_id} by user {current_user.id}")
        
        return CommunityResponse.model_validate(community)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating community {community_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the community: {str(e)}",
        )


@router.delete("/{community_id}", status_code=status.HTTP_200_OK)
async def delete_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a community by its ID.
    
    Requires authentication - only the creator can delete their community.
    
    - **community_id**: The ID of the community to delete
    
    Returns a success message if the community was deleted.
    """
    try:
        community = db.query(Community).filter(Community.id == community_id).first()
        
        if not community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community with ID {community_id} not found",
            )
        
        # Check if the current user is the creator
        if community.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this community. Only the creator can delete it.",
            )
        
        # Delete the community
        db.delete(community)
        db.commit()
        
        logger.info(f"Community deleted: {community_id} by user {current_user.id}")
        
        return {
            "message": "Community deleted successfully",
            "community_id": community_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting community {community_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the community: {str(e)}",
        )

