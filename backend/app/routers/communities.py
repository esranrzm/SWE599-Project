from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Community, User, CommunityTab, InputType, InputTypeItem
from app.schemas import (
    CommunityCreate, CommunityResponse, CommunityUpdate,
    CommunityInputSubmission, CommunityInputResponse, SelectedInputField,
    InputTypeResponse
)
from app.dependencies import get_current_user
from sqlalchemy.orm import joinedload

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


def generate_tab_form_structure(tab_data) -> Optional[Dict[str, Any]]:
    # Map input type names to the required format
    def map_input_type(input_type: str) -> str:
        type_mapping = {
            "dropdown list": "dropdown",
            "multiple select": "multiselect",
            "free text": "free text"
        }
        return type_mapping.get(input_type, input_type)
    
    tab_inputs = []
    input_types_data = tab_data.inputTypes if hasattr(tab_data, 'inputTypes') and tab_data.inputTypes else []
    
    # If no inputs, return None
    if not input_types_data or len(input_types_data) == 0:
        return None
    
    for input_index, input_data in enumerate(input_types_data):
        input_obj = {
            "input_id": input_index,
            "input_title": input_data.name,
            "input_type": map_input_type(input_data.type)
        }
        
        # Add input_fields only for dropdown and multiselect
        if input_data.type in ["dropdown list", "multiple select"]:
            if input_data.items and len(input_data.items) > 0:
                input_obj["input_fields"] = [{"value": item.value} for item in input_data.items]
            else:
                input_obj["input_fields"] = []
        else:  # free text
            input_obj["input_fields"] = None
        
        tab_inputs.append(input_obj)
    
    return {"tab_inputs": tab_inputs}


@router.post("/", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
async def create_community(
    community_data: CommunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Validate tab limit (maximum 10 tabs)
        if community_data.tabs and len(community_data.tabs) > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 tabs allowed per community"
            )
        
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
        db.flush()  # Flush to get the community ID
        
        # Create tabs if provided
        if community_data.tabs:
            for tab_order, tab_data in enumerate(community_data.tabs):
                # Generate tab_form_structure JSON for this tab
                tab_form_structure = generate_tab_form_structure(tab_data)
                
                new_tab = CommunityTab(
                    community_id=new_community.id,
                    name=tab_data.name,
                    color=tab_data.color,
                    description=tab_data.description,
                    tab_form_structure=tab_form_structure,
                    display_order=tab_data.display_order if tab_data.display_order else tab_order
                )
                db.add(new_tab)
                # No need to flush here since we're not creating related input_types entries
        
        db.commit()
        db.refresh(new_community)
        
        # Eager load tabs for response (no need to load input_types since we use tab_form_structure)
        db.refresh(new_community)
        community_with_tabs = db.query(Community)\
            .options(
                joinedload(Community.tabs)
            )\
            .filter(Community.id == new_community.id)\
            .first()
        
        logger.info(f"Community created: {new_community.id} by user {current_user.id}")
        
        return CommunityResponse.model_validate(community_with_tabs)
        
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
    try:
        # Limit the maximum results to prevent abuse
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        communities = db.query(Community)\
            .options(
                joinedload(Community.tabs)
            )\
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
    try:
        # Limit the maximum results to prevent abuse
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        communities = db.query(Community)\
            .options(
                joinedload(Community.tabs)
            )\
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
    try:
        # Limit the maximum results to prevent abuse
        if limit > 1000:
            limit = 1000
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 100
        
        communities = db.query(Community)\
            .options(
                joinedload(Community.tabs)
            )\
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
    try:
        community = db.query(Community)\
            .options(
                joinedload(Community.tabs)
            )\
            .filter(Community.id == community_id)\
            .first()
        
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
        
        # Eager load tabs for response (no need to load input_types since we use tab_form_structure)
        updated_community = db.query(Community)\
            .options(
                joinedload(Community.tabs)
            )\
            .filter(Community.id == community_id)\
            .first()
        
        logger.info(f"Community updated: {community_id} by user {current_user.id}")
        
        return CommunityResponse.model_validate(updated_community)
        
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


@router.post("/{community_id}/inputs", response_model=CommunityInputResponse, status_code=status.HTTP_201_CREATED)
async def submit_community_input(
    community_id: int,
    input_data: CommunityInputSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify the tab exists and belongs to the community
        tab = db.query(CommunityTab).filter(
            CommunityTab.id == input_data.tab_id,
            CommunityTab.community_id == community_id
        ).first()
        
        if not tab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab with ID {input_data.tab_id} not found in community {community_id}",
            )
        
        # Map input_type from frontend format to database format
        def map_input_type(input_type: str) -> str:
            type_mapping = {
                "dropdown": "dropdown list",
                "multiselect": "multiple select",
                "free text": "free text"
            }
            return type_mapping.get(input_type, input_type)
        
        # Create input types and items for each tab input
        for tab_input in input_data.tab_inputs:
            # Validate that selected_input_fields is not empty
            if not tab_input.selected_input_fields or len(tab_input.selected_input_fields) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"At least one selection is required for '{tab_input.input_title}'",
                )
            
            # Get creator name from request or current user
            creator_name = input_data.input_creator or f"{current_user.name} {current_user.surname}".strip()
            
            # Create InputType entry
            new_input_type = InputType(
                community_id=community_id,
                tab_id=input_data.tab_id,
                type=map_input_type(tab_input.input_type),
                name=tab_input.input_title,
                creator_name=creator_name,
                display_order=tab_input.input_id
            )
            db.add(new_input_type)
            db.flush()  # Flush to get the input type ID
            
            # Create InputTypeItem entries for selected values
            for item_order, selected_field in enumerate(tab_input.selected_input_fields):
                new_item = InputTypeItem(
                    input_type_id=new_input_type.id,
                    value=selected_field.value,
                    display_order=item_order
                )
                db.add(new_item)
        
        db.commit()
        
        logger.info(f"Community input submitted: community {community_id}, tab {input_data.tab_id} by user {current_user.id}")
        
        return CommunityInputResponse(
            message="Community input submitted successfully",
            input_id=new_input_type.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting community input: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while submitting the community input: {str(e)}",
        )


@router.get("/{community_id}/inputs", response_model=List[InputTypeResponse], status_code=status.HTTP_200_OK)
async def get_community_inputs(
    community_id: int,
    tab_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify the community exists
        community = db.query(Community).filter(Community.id == community_id).first()
        if not community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community with ID {community_id} not found",
            )
        
        # Build query
        query = db.query(InputType).join(CommunityTab).filter(
            CommunityTab.community_id == community_id
        )
        
        # Filter by tab if provided
        if tab_id is not None:
            # Verify the tab exists and belongs to the community
            tab = db.query(CommunityTab).filter(
                CommunityTab.id == tab_id,
                CommunityTab.community_id == community_id
            ).first()
            if not tab:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tab with ID {tab_id} not found in community {community_id}",
                )
            query = query.filter(InputType.tab_id == tab_id)
        
        # Eager load items
        inputs = query.options(
            joinedload(InputType.items)
        ).order_by(InputType.created_at.desc()).all()
        
        return [InputTypeResponse.model_validate(input_type) for input_type in inputs]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving community inputs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving community inputs: {str(e)}",
        )


@router.put("/{community_id}/inputs/{input_id}", response_model=CommunityInputResponse, status_code=status.HTTP_200_OK)
async def update_community_input(
    community_id: int,
    input_id: int,
    input_data: CommunityInputSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify the tab exists and belongs to the community
        tab = db.query(CommunityTab).filter(
            CommunityTab.id == input_data.tab_id,
            CommunityTab.community_id == community_id
        ).first()
        
        if not tab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab with ID {input_data.tab_id} not found in community {community_id}",
            )
        
        first_input = db.query(InputType).filter(InputType.id == input_id).first()
        if not first_input:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Input with ID {input_id} not found",
            )
        
        if first_input.creator_name and first_input.creator_name != current_user.username and first_input.creator_name != f"{current_user.name} {current_user.surname}".strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this input. Only the creator can update it.",
            )
        
        created_time = first_input.created_at
        timestamp_floor = created_time.replace(microsecond=0)
        timestamp_ceil = timestamp_floor + timedelta(seconds=1)
        
        submission_inputs = db.query(InputType).filter(
            InputType.tab_id == input_data.tab_id,
            InputType.creator_name == first_input.creator_name,
            InputType.created_at >= timestamp_floor,
            InputType.created_at < timestamp_ceil
        ).all()
        
        def map_input_type(input_type: str) -> str:
            type_mapping = {
                "dropdown": "dropdown list",
                "multiselect": "multiple select",
                "free text": "free text"
            }
            return type_mapping.get(input_type, input_type)
        
        # Delete old input items
        for old_input in submission_inputs:
            db.query(InputTypeItem).filter(InputTypeItem.input_type_id == old_input.id).delete()
            db.delete(old_input)
        
        db.flush()
        
        # Create new input types and items
        creator_name = input_data.input_creator or f"{current_user.name} {current_user.surname}".strip()
        
        for tab_input in input_data.tab_inputs:
            # Validate that selected_input_fields is not empty
            if not tab_input.selected_input_fields or len(tab_input.selected_input_fields) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"At least one selection is required for '{tab_input.input_title}'",
                )
            
            # Create InputType entry
            new_input_type = InputType(
                community_id=community_id,
                tab_id=input_data.tab_id,
                type=map_input_type(tab_input.input_type),
                name=tab_input.input_title,
                creator_name=creator_name,
                display_order=tab_input.input_id
            )
            db.add(new_input_type)
            db.flush()  # Flush to get the input type ID
            
            # Create InputTypeItem entries for selected values
            for item_order, selected_field in enumerate(tab_input.selected_input_fields):
                new_item = InputTypeItem(
                    input_type_id=new_input_type.id,
                    value=selected_field.value,
                    display_order=item_order
                )
                db.add(new_item)
        
        db.commit()
        
        logger.info(f"Community input updated: community {community_id}, tab {input_data.tab_id}, input {input_id} by user {current_user.id}")
        
        return CommunityInputResponse(
            message="Community input updated successfully",
            input_id=new_input_type.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating community input: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the community input: {str(e)}",
        )


@router.delete("/{community_id}/inputs/{input_id}", status_code=status.HTTP_200_OK)
async def delete_community_input(
    community_id: int,
    input_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Find the first input
        first_input = db.query(InputType).filter(InputType.id == input_id).first()
        if not first_input:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Input with ID {input_id} not found",
            )
        
        # Verify the tab belongs to the community
        tab = db.query(CommunityTab).filter(
            CommunityTab.id == first_input.tab_id,
            CommunityTab.community_id == community_id
        ).first()
        
        if not tab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Input does not belong to community {community_id}",
            )
        
        # Check if current user is the creator
        if first_input.creator_name and first_input.creator_name != current_user.username and first_input.creator_name != f"{current_user.name} {current_user.surname}".strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this input. Only the creator can delete it.",
            )
        
        # Find all inputs in the same submission (same creator, same timestamp within 1 second)
        created_time = first_input.created_at
        timestamp_floor = created_time.replace(microsecond=0)
        timestamp_ceil = timestamp_floor + timedelta(seconds=1)
        
        submission_inputs = db.query(InputType).filter(
            InputType.tab_id == first_input.tab_id,
            InputType.creator_name == first_input.creator_name,
            InputType.created_at >= timestamp_floor,
            InputType.created_at < timestamp_ceil
        ).all()
        
        # Delete all input items first (due to foreign key constraints)
        for input_type in submission_inputs:
            db.query(InputTypeItem).filter(InputTypeItem.input_type_id == input_type.id).delete()
        
        # Delete all input types in the submission
        for input_type in submission_inputs:
            db.delete(input_type)
        
        db.commit()
        
        logger.info(f"Community input deleted: community {community_id}, input {input_id} by user {current_user.id}")
        
        return {
            "message": "Community input deleted successfully",
            "input_id": input_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting community input: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the community input: {str(e)}",
        )

