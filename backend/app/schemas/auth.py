"""Authentication and JWT token schemas."""

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import EnglishLevel
from app.schemas.user import UserRead


class UserRegisterRequest(BaseModel):
    """Registration payload for a new learner account."""

    username: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    level: EnglishLevel = EnglishLevel.A2


class UserLoginRequest(BaseModel):
    """JSON login payload accepting username or email as identifier."""

    identifier: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=1, max_length=72)


class TokenResponse(BaseModel):
    """JWT access token paired with the authenticated learner profile."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead
