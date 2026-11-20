"""Admin dashboard schemas."""

from datetime import datetime
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict

from app.models.enums import EnglishLevel, TaskType


class AdminOverview(BaseModel):
    """Aggregated platform metrics for administrator."""

    total_students: int
    total_topics: int
    total_tasks: int
    total_submissions: int
    average_score: float


class AdminStudentItem(BaseModel):
    """Learner record with performance stats."""

    id: uuid.UUID
    username: str
    email: str
    level: EnglishLevel
    created_at: datetime
    is_first_login: bool
    completed_count: int
    average_score: float


class AdminSubmissionItem(BaseModel):
    """Detailed learner task submission with AI feedback."""

    id: uuid.UUID
    user_id: uuid.UUID
    student_name: str
    student_email: str
    student_level: EnglishLevel
    topic_id: uuid.UUID
    topic_title: str
    topic_level: EnglishLevel
    task_id: uuid.UUID
    task_type: TaskType
    task_title: str
    score: float
    ai_feedback: dict[str, Any] | None = None
    completed_at: datetime
