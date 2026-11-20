"""Pydantic v2 schemas for AI service responses and requests."""

import uuid

from pydantic import BaseModel, Field, field_validator


class EssayErrorItem(BaseModel):
    """Single grammatical or lexical issue identified in a learner essay."""

    sentence: str
    correction: str
    explanation: str


class EssayEvaluationResponse(BaseModel):
    """Structured essay evaluation JSON returned by the LLM evaluator."""

    score: int = Field(ge=1, le=10)
    errors: list[EssayErrorItem] = Field(default_factory=list)
    feedback: str = Field(min_length=1)

    @field_validator("score", mode="before")
    @classmethod
    def normalize_score(cls, value: object) -> int:
        """Accept int/float strings or numbers and clamp to 1..10, rejecting bools."""
        if isinstance(value, bool):
            raise ValueError("Score must be an integer, not a boolean.")
        if isinstance(value, (int, float)):
            numeric = round(value)
        elif isinstance(value, str) and value.strip():
            numeric = round(float(value.strip()))
        else:
            raise ValueError("Score must be a valid integer between 1 and 10.")
        return max(1, min(10, int(numeric)))


class HomeworkEvaluateResponse(EssayEvaluationResponse):
    """API response for POST /api/v1/homework/evaluate."""

    progress_id: uuid.UUID | None = None


class ChatMessageInput(BaseModel):
    """Single message item in onboarding or tutor chat history."""

    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1)


class OnboardingChatRequest(BaseModel):
    """Payload for asking the onboarding assistant a question."""

    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessageInput] = Field(default_factory=list)


class OnboardingChatResponse(BaseModel):
    """Reply returned by the onboarding guide assistant."""

    reply: str
    is_fallback: bool = False


class TaskAIReviewResponse(BaseModel):
    """Thoughtful AI diagnostic analysis after task verification."""

    analysis: str
    wrong_items: list[str] = Field(default_factory=list)
    is_fallback: bool = False
