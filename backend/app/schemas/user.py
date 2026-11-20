"""User and learner progress schemas."""

from datetime import datetime
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import EnglishLevel, TaskType


class UserRead(BaseModel):
    """Public learner profile returned by /users/me and auth endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: EmailStr
    level: EnglishLevel
    is_first_login: bool
    is_admin: bool = False
    created_at: datetime


class UserUpdate(BaseModel):
    """Allowed profile fields a learner can update."""

    username: str | None = Field(default=None, min_length=2, max_length=100)
    level: EnglishLevel | None = None


class OnboardingCompleteResponse(BaseModel):
    """Response confirming onboarding state transition."""

    is_first_login: bool
    user: UserRead


class ProgressRead(BaseModel):
    """Single task completion record."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    topic_id: uuid.UUID
    task_id: uuid.UUID
    score: float
    ai_feedback: dict[str, Any] | None = None
    completed_at: datetime


class ProgressItemWithMeta(ProgressRead):
    """Progress record enriched with topic title and task type."""

    topic_title: str
    task_type: TaskType


class UserProgressSummary(BaseModel):
    """Aggregated progress statistics for the learner dashboard/profile."""

    completed_tasks: int
    average_score: float
    records: list[ProgressItemWithMeta]
