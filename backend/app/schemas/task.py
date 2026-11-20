"""Task CRUD, practice sanitization, and submission validation schemas."""

import copy
from typing import Any, Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import TaskType


class TestQuestionItem(BaseModel):
    """Single item inside a multi-question test task."""

    id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    options: list[str] = Field(min_length=2)
    correct_answer: str = Field(min_length=1)
    explanation: str = ""

    @model_validator(mode="after")
    def validate_correct_answer_in_options(self) -> "TestQuestionItem":
        """Ensure correct_answer matches one of the item's options."""
        if self.correct_answer not in self.options:
            raise ValueError(
                f"correct_answer '{self.correct_answer}' must be one of options."
            )
        return self


class TestTaskContent(BaseModel):
    """Schema for single-question or multi-question test tasks."""

    title: str = ""
    instruction: str = ""
    order: int | None = None
    display_mode: Literal["choice", "underline"] = "choice"
    question: str | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    explanation: str = ""
    questions: list[TestQuestionItem] | None = None

    @model_validator(mode="after")
    def validate_structure(self) -> "TestTaskContent":
        """Ensure either single-question fields or non-empty questions list exist."""
        if self.questions:
            seen_ids = set()
            for item in self.questions:
                if item.id in seen_ids:
                    raise ValueError(f"Duplicate question id '{item.id}'.")
                seen_ids.add(item.id)
            return self

        if not self.question or not self.options or len(self.options) < 2:
            raise ValueError(
                "Provide either non-empty 'questions' or 'question' + at least 2 'options'."
            )
        if not self.correct_answer or self.correct_answer not in self.options:
            raise ValueError("correct_answer must be one of options.")
        return self


class MatchingPairItem(BaseModel):
    """Single word-to-illustration pair inside a matching gamified task."""

    id: str = Field(min_length=1)
    word: str = Field(min_length=1)
    description: str = Field(min_length=1)
    image_key: str = Field(min_length=1)


class GamifiedTaskContent(BaseModel):
    """Schema for drag-and-drop sentence-building or picture-word matching tasks."""

    title: str = ""
    instruction: str = "Arrange the words to build a correct sentence."
    order: int | None = None
    mode: Literal["sentence_builder", "matching"] = "sentence_builder"
    correct_sentence: str | None = None
    words: list[str] = Field(default_factory=list)
    pairs: list[MatchingPairItem] = Field(default_factory=list)
    hint: str = ""

    @model_validator(mode="after")
    def validate_mode_fields(self) -> "GamifiedTaskContent":
        """Validate required fields for either sentence_builder or matching mode."""
        if self.mode == "matching":
            if len(self.pairs) < 2:
                raise ValueError("matching task must contain at least 2 pairs.")
            seen_ids = set()
            for pair in self.pairs:
                if pair.id in seen_ids:
                    raise ValueError(f"Duplicate pair id '{pair.id}'.")
                seen_ids.add(pair.id)
            return self

        if not self.correct_sentence or not self.correct_sentence.strip():
            raise ValueError("correct_sentence is required for sentence_builder mode.")
        if not self.words:
            self.words = self.correct_sentence.split()
        if len(self.words) < 2:
            raise ValueError("gamified task must contain at least 2 words.")
        return self


class EssayTaskContent(BaseModel):
    """Schema for open-ended essay assignment content."""

    title: str = ""
    order: int | None = None
    prompt: str = Field(min_length=1)
    min_words: int = Field(default=40, ge=1)
    max_words: int = Field(default=500, ge=1)
    rubric: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_word_bounds(self) -> "EssayTaskContent":
        """Ensure min_words does not exceed max_words."""
        if self.min_words > self.max_words:
            raise ValueError("min_words cannot exceed max_words.")
        return self


def validate_task_content(task_type: TaskType, content: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize task JSONB content according to TaskType."""
    validators = {
        TaskType.test: TestTaskContent,
        TaskType.gamified: GamifiedTaskContent,
        TaskType.essay: EssayTaskContent,
    }
    model_cls = validators[task_type]
    return model_cls.model_validate(content).model_dump(exclude_none=True)


def sanitize_task_content(task_type: TaskType, content: dict[str, Any]) -> dict[str, Any]:
    """Strip answer keys before sending tasks to learners for practice."""
    sanitized = copy.deepcopy(content)
    if task_type == TaskType.test:
        sanitized.pop("correct_answer", None)
        sanitized.pop("explanation", None)
        if isinstance(sanitized.get("questions"), list):
            for question in sanitized["questions"]:
                if isinstance(question, dict):
                    question.pop("correct_answer", None)
                    question.pop("explanation", None)
    elif task_type == TaskType.gamified:
        if sanitized.get("mode") == "matching":
            pairs = sanitized.pop("pairs", []) or []
            sanitized["cards"] = [
                {
                    "id": pair["id"],
                    "description": pair["description"],
                    "image_key": pair["image_key"],
                }
                for pair in pairs
            ]
            sanitized["words"] = sorted(
                (str(pair["word"]) for pair in pairs),
                key=lambda word: word.lower(),
            )
        else:
            sanitized.pop("pairs", None)
            correct_sentence = sanitized.pop("correct_sentence", "") or ""
            words = list(sanitized.get("words") or [])
            solution_words = correct_sentence.split()
            if words == solution_words and len(words) > 1:
                sanitized["words"] = words[1:] + words[:1]
    return sanitized


class TaskCreate(BaseModel):
    """Payload to create a new task inside a topic."""

    type: TaskType
    content: dict[str, Any]

    @model_validator(mode="after")
    def validate_content_for_type(self) -> "TaskCreate":
        """Validate task content structure for the selected TaskType."""
        self.content = validate_task_content(self.type, self.content)
        return self


class TaskUpdate(BaseModel):
    """Partial update payload for an existing task."""

    type: TaskType | None = None
    content: dict[str, Any] | None = None


class TaskRead(BaseModel):
    """Full task representation for CRUD administration."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic_id: uuid.UUID
    type: TaskType
    content: dict[str, Any]


class TaskPracticeRead(BaseModel):
    """Learner-facing task representation without answer keys."""

    id: uuid.UUID
    topic_id: uuid.UUID
    type: TaskType
    content: dict[str, Any]


class TaskSubmitRequest(BaseModel):
    """Learner answer submission for test, sentence-builder, or matching tasks."""

    answer: str | None = None
    words: list[str] | None = None
    answers: dict[str, str] | None = None
    matches: dict[str, str] | None = None

    @model_validator(mode="after")
    def ensure_answer_present(self) -> "TaskSubmitRequest":
        """Require at least one valid answer format."""
        has_single = self.answer is not None and bool(self.answer.strip())
        has_words = bool(self.words)
        has_answers = bool(self.answers)
        has_matches = bool(self.matches)
        if not (has_single or has_words or has_answers or has_matches):
            raise ValueError(
                "Provide 'answer', 'words', 'answers', or 'matches'."
            )
        return self


class TaskSubmitItemResult(BaseModel):
    """Per-item evaluation result for multi-question tests and matching tasks."""

    id: str
    is_correct: bool
    submitted: str
    explanation: str | None = None


class TaskSubmitResponse(BaseModel):
    """Backend validation result for a submitted task."""

    task_id: uuid.UUID
    task_type: TaskType
    is_correct: bool
    score: float
    feedback: str
    explanation: str | None = None
    should_open_tutor: bool
    wrong_summary: str | None = None
    progress_id: uuid.UUID
    correct_count: int | None = None
    total_count: int | None = None
    item_results: list[TaskSubmitItemResult] = Field(default_factory=list)
