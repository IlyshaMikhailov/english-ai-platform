"""Homework essay upload and AI evaluation endpoint."""

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import TaskType
from app.models.progress import Progress
from app.models.task import Task
from app.models.user import User
from app.schemas.ai import HomeworkEvaluateResponse
from app.services.llm_service import (
    LLMConnectionError,
    LLMResponseParseError,
    LLMService,
    get_llm_service,
)

router = APIRouter(prefix="/homework", tags=["homework"])

MAX_ESSAY_FILE_BYTES = 200 * 1024


def _read_txt_upload(raw_bytes: bytes, file: UploadFile) -> str:
    """Validate and decode an uploaded .txt essay file."""
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if filename and not filename.endswith(".txt"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt files are supported for essay evaluation.",
        )
    if not filename and content_type not in ("text/plain", ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only plain text (.txt) files are supported.",
        )
    if len(raw_bytes) > MAX_ESSAY_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Uploaded essay file exceeds 200 KB limit.",
        )

    try:
        text = raw_bytes.decode("utf-8-sig").strip()
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Essay file must be valid UTF-8 encoded text.",
        ) from exc

    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded essay file is empty.",
        )
    return text


@router.post("/evaluate", response_model=HomeworkEvaluateResponse)
async def evaluate_homework_essay(
    file: UploadFile = File(...),
    task_id: uuid.UUID | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(get_llm_service),
) -> HomeworkEvaluateResponse:
    """Parse a .txt essay upload and evaluate it using the local Ollama LLM."""
    raw_bytes = await file.read()
    essay_text = _read_txt_upload(raw_bytes, file)

    task: Task | None = None
    task_prompt: str | None = None
    if task_id is not None:
        result = await db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )
        if task.type != TaskType.essay:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specified task_id is not an essay task.",
            )
        task_prompt = str(task.content.get("prompt") or "") or None

    try:
        evaluation = await llm_service.evaluate_essay(
            essay_text=essay_text,
            level=current_user.level,
            task_prompt=task_prompt,
        )
    except LLMConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except LLMResponseParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    progress_id: uuid.UUID | None = None
    if task is not None:
        progress = Progress(
            user_id=current_user.id,
            topic_id=task.topic_id,
            task_id=task.id,
            score=float(evaluation.score),
            ai_feedback=evaluation.model_dump(),
        )
        db.add(progress)
        await db.commit()
        await db.refresh(progress)
        progress_id = progress.id

    return HomeworkEvaluateResponse(
        score=evaluation.score,
        errors=evaluation.errors,
        feedback=evaluation.feedback,
        progress_id=progress_id,
    )
