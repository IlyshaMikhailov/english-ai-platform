"""Learner profile, onboarding state, and progress endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.progress import Progress
from app.models.task import Task
from app.models.topic import Topic
from app.models.user import User
from app.schemas.user import (
    OnboardingCompleteResponse,
    ProgressItemWithMeta,
    UserProgressSummary,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Return the authenticated learner's profile and is_first_login flag."""
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_my_profile(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Update authenticated learner's username or CEFR English level."""
    if payload.username is not None:
        cleaned = payload.username.strip()
        if cleaned != current_user.username:
            existing = await db.execute(
                select(User).where(User.username == cleaned, User.id != current_user.id)
            )
            if existing.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username is already taken.",
                )
            current_user.username = cleaned

    if payload.level is not None:
        current_user.level = payload.level

    await db.commit()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.post("/onboarding-complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnboardingCompleteResponse:
    """Mark the learner's first-login onboarding tour as completed."""
    if current_user.is_first_login:
        current_user.is_first_login = False
        await db.commit()
        await db.refresh(current_user)

    return OnboardingCompleteResponse(
        is_first_login=current_user.is_first_login,
        user=UserRead.model_validate(current_user),
    )


@router.get("/me/progress", response_model=UserProgressSummary)
async def get_my_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProgressSummary:
    """Return all task completion records and summary stats for the learner."""
    stmt = (
        select(Progress, Topic.title, Task.type)
        .join(Topic, Progress.topic_id == Topic.id)
        .join(Task, Progress.task_id == Task.id)
        .where(Progress.user_id == current_user.id)
        .order_by(Progress.completed_at.desc())
    )
    rows = (await db.execute(stmt)).all()

    records = [
        ProgressItemWithMeta(
            id=progress.id,
            user_id=progress.user_id,
            topic_id=progress.topic_id,
            task_id=progress.task_id,
            score=progress.score,
            ai_feedback=progress.ai_feedback,
            completed_at=progress.completed_at,
            topic_title=topic_title,
            task_type=task_type,
        )
        for progress, topic_title, task_type in rows
    ]

    completed_tasks = len(records)
    average_score = (
        round(sum(item.score for item in records) / completed_tasks, 2)
        if completed_tasks > 0
        else 0.0
    )

    return UserProgressSummary(
        completed_tasks=completed_tasks,
        average_score=average_score,
        records=records,
    )
