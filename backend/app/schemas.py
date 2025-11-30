from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime

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


class CommunityCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=500)
    # tabs_config will be stored in separate table later, not in communities table


class CommunityUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=500)


class CommunityResponse(BaseModel):
    id: int
    title: str
    description: str
    creator_id: int
    creator_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

