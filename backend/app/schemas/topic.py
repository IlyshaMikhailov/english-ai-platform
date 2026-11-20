"""Topic CRUD and detail schemas."""

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EnglishLevel


class TopicBase(BaseModel):
    """Shared topic fields."""

    title: str = Field(min_length=2, max_length=255)
    description: str = Field(default="")
    video_url: str | None = Field(default=None, max_length=512)
    presentation_url: str | None = Field(default=None, max_length=512)
    level: EnglishLevel


class TopicCreate(TopicBase):
    """Payload to create a new learning topic."""


class TopicUpdate(BaseModel):
    """Partial update payload for an existing topic."""

    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    video_url: str | None = Field(default=None, max_length=512)
    presentation_url: str | None = Field(default=None, max_length=512)
    level: EnglishLevel | None = None


class TopicRead(TopicBase):
    """Serialized topic representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
