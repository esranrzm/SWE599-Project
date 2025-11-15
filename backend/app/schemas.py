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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

