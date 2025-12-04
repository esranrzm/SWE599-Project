from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.models import CommunityInput, Community, CommunityTab, InputType, User
from app.schemas import CommunityInputCreate, CommunityInputUpdate, CommunityInputResponse
from app.dependencies import get_current_user
from sqlalchemy.orm import joinedload

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/communities/{community_id}/inputs", tags=["community-inputs"])


@router.post("/", response_model=CommunityInputResponse, status_code=status.HTTP_201_CREATED)
async def create_community_input(
    community_id: int,
    input_data: CommunityInputCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new community input.
    
    Requires authentication.
    """
    try:
        # Verify community exists
        community = db.query(Community).filter(Community.id == community_id).first()
        if not community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community with ID {community_id} not found",
            )
        
        # Verify tab exists and belongs to community
        tab = db.query(CommunityTab).filter(
            CommunityTab.id == input_data.tab_id,
            CommunityTab.community_id == community_id
        ).first()
        if not tab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab with ID {input_data.tab_id} not found for this community",
            )
        
        # Verify input type exists and belongs to tab
        input_type = db.query(InputType).filter(
            InputType.id == input_data.input_type_id,
            InputType.tab_id == input_data.tab_id
        ).first()
        if not input_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Input type with ID {input_data.input_type_id} not found for this tab",
            )
        
        # Create new community input
        new_input = CommunityInput(
            community_id=community_id,
            tab_id=input_data.tab_id,
            input_type_id=input_data.input_type_id,
            creator_id=current_user.id,
            details=input_data.details
        )
        
        db.add(new_input)
        db.commit()
        db.refresh(new_input)
        
        # Load creator information
        creator = db.query(User).filter(User.id == current_user.id).first()
        
        logger.info(f"Community input created: {new_input.id} by user {current_user.id}")
        
        response = CommunityInputResponse.model_validate(new_input)
        response.creator_username = creator.username if creator else None
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating community input: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the community input: {str(e)}",
        )


@router.get("/", response_model=List[CommunityInputResponse], status_code=status.HTTP_200_OK)
async def get_community_inputs(
    community_id: int,
    tab_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all community inputs for a community.
    
    Optionally filter by tab_id.
    """
    try:
        # Verify community exists
        community = db.query(Community).filter(Community.id == community_id).first()
        if not community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community with ID {community_id} not found",
            )
        
        query = db.query(CommunityInput).filter(CommunityInput.community_id == community_id)
        
        if tab_id is not None:
            query = query.filter(CommunityInput.tab_id == tab_id)
        
        inputs = query.options(
            joinedload(CommunityInput.creator)
        ).order_by(CommunityInput.created_at.desc()).all()
        
        # Map to response with creator username
        result = []
        for input_item in inputs:
            response = CommunityInputResponse.model_validate(input_item)
            response.creator_username = input_item.creator.username if input_item.creator else None
            result.append(response)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving community inputs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving community inputs: {str(e)}",
        )


@router.get("/{input_id}", response_model=CommunityInputResponse, status_code=status.HTTP_200_OK)
async def get_community_input_by_id(
    community_id: int,
    input_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a community input by its ID.
    """
    try:
        input_item = db.query(CommunityInput).options(
            joinedload(CommunityInput.creator)
        ).filter(
            CommunityInput.id == input_id,
            CommunityInput.community_id == community_id
        ).first()
        
        if not input_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community input with ID {input_id} not found",
            )
        
        response = CommunityInputResponse.model_validate(input_item)
        response.creator_username = input_item.creator.username if input_item.creator else None
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving community input {input_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving the community input: {str(e)}",
        )


@router.put("/{input_id}", response_model=CommunityInputResponse, status_code=status.HTTP_200_OK)
async def update_community_input(
    community_id: int,
    input_id: int,
    input_data: CommunityInputUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a community input by its ID.
    
    Requires authentication - only the creator can update their input.
    """
    try:
        input_item = db.query(CommunityInput).filter(
            CommunityInput.id == input_id,
            CommunityInput.community_id == community_id
        ).first()
        
        if not input_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community input with ID {input_id} not found",
            )
        
        # Check if the current user is the creator
        if input_item.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this input. Only the creator can update it.",
            )
        
        # Verify tab if provided
        if input_data.tab_id is not None:
            tab = db.query(CommunityTab).filter(
                CommunityTab.id == input_data.tab_id,
                CommunityTab.community_id == community_id
            ).first()
            if not tab:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tab with ID {input_data.tab_id} not found for this community",
                )
            input_item.tab_id = input_data.tab_id
        
        # Verify input type if provided
        if input_data.input_type_id is not None:
            # Use the tab_id from input_data if provided, otherwise use existing tab_id
            tab_id_to_check = input_data.tab_id if input_data.tab_id is not None else input_item.tab_id
            input_type = db.query(InputType).filter(
                InputType.id == input_data.input_type_id,
                InputType.tab_id == tab_id_to_check
            ).first()
            if not input_type:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Input type with ID {input_data.input_type_id} not found for this tab",
                )
            input_item.input_type_id = input_data.input_type_id
        
        # Update details if provided
        if input_data.details is not None:
            input_item.details = input_data.details
        
        db.commit()
        db.refresh(input_item)
        
        # Load creator information
        input_item = db.query(CommunityInput).options(
            joinedload(CommunityInput.creator)
        ).filter(CommunityInput.id == input_id).first()
        
        logger.info(f"Community input updated: {input_id} by user {current_user.id}")
        
        response = CommunityInputResponse.model_validate(input_item)
        response.creator_username = input_item.creator.username if input_item.creator else None
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating community input {input_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the community input: {str(e)}",
        )


@router.delete("/{input_id}", status_code=status.HTTP_200_OK)
async def delete_community_input(
    community_id: int,
    input_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a community input by its ID.
    
    Requires authentication - only the creator can delete their input.
    """
    try:
        input_item = db.query(CommunityInput).filter(
            CommunityInput.id == input_id,
            CommunityInput.community_id == community_id
        ).first()
        
        if not input_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community input with ID {input_id} not found",
            )
        
        # Check if the current user is the creator
        if input_item.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this input. Only the creator can delete it.",
            )
        
        # Delete the input
        db.delete(input_item)
        db.commit()
        
        logger.info(f"Community input deleted: {input_id} by user {current_user.id}")
        
        return {
            "message": "Community input deleted successfully",
            "input_id": input_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting community input {input_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the community input: {str(e)}",
        )

