from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List
from datetime import date, datetime
import re

class UserRegistration(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=6)
    profession: str = Field(..., min_length=1, max_length=100)
    dateOfBirth: date = Field(..., alias="dateOfBirth")
    photo: Optional[str] = None
    consent: bool
    
    class Config:
        populate_by_name = True  # Allows both dateOfBirth and date_of_birth

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    name: str
    surname: str
    profession: str
    date_of_birth: date
    photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=1, max_length=50)
    profession: str = Field(..., min_length=1, max_length=100)
    photo_url: Optional[str] = None


class PasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


# Input Type Item Schemas
class InputTypeItemCreate(BaseModel):
    value: str = Field(..., min_length=1, max_length=500)
    display_order: int = Field(default=0, ge=0)

class InputTypeItemResponse(BaseModel):
    id: int
    value: str
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True

# Input Type Schemas
class InputTypeCreate(BaseModel):
    type: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    items: List[InputTypeItemCreate] = Field(default_factory=list)
    display_order: int = Field(default=0, ge=0)

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        allowed_types = ['free text', 'dropdown list', 'multiple select']
        if v not in allowed_types:
            raise ValueError(f"Input type must be one of: {', '.join(allowed_types)}")
        return v

    @model_validator(mode='after')
    def validate_items(self):
        if self.type in ['dropdown list', 'multiple select']:
            if not self.items or len(self.items) == 0:
                raise ValueError(f"Items are required for '{self.type}' input type (at least 1 item)")
        elif self.type == 'free text':
            if self.items and len(self.items) > 0:
                raise ValueError("Items are not allowed for 'free text' input type")
        return self

class InputTypeResponse(BaseModel):
    id: int
    type: str
    name: str
    display_order: int
    items: List[InputTypeItemResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Tab Schemas
class CommunityTabCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    color: str = Field(..., min_length=7, max_length=7)
    description: Optional[str] = Field(None, max_length=1000)
    inputTypes: List[InputTypeCreate] = Field(default_factory=list, alias="inputTypes")
    display_order: int = Field(default=0, ge=0)

    @field_validator('color')
    @classmethod
    def validate_color(cls, v):
        # Validate hex color code format: #RRGGBB
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError("Color must be a valid hex color code (e.g., #f97316)")
        return v

    class Config:
        populate_by_name = True

class CommunityTabResponse(BaseModel):
    id: int
    name: str
    color: str
    description: Optional[str] = None
    display_order: int
    inputTypes: List[InputTypeResponse] = Field(default_factory=list, alias="input_types")
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True

class CommunityCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=500)
    tabs: Optional[List[CommunityTabCreate]] = Field(default=None)



class CommunityUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=500)


class CommunityResponse(BaseModel):
    id: int
    title: str
    description: str
    creator_id: int
    creator_name: str
    tabs: Optional[List[CommunityTabResponse]] = Field(default=None)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Community Input Schemas
class CommunityInputCreate(BaseModel):
    community_id: int
    tab_id: int
    input_type_id: int
    details: str = Field(..., min_length=1)


class CommunityInputUpdate(BaseModel):
    tab_id: Optional[int] = None
    input_type_id: Optional[int] = None
    details: Optional[str] = Field(None, min_length=1)


class CommunityInputResponse(BaseModel):
    id: int
    community_id: int
    tab_id: int
    input_type_id: int
    creator_id: int
    creator_username: Optional[str] = None
    details: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
