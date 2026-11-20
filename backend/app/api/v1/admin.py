"""Administrator management API: platform overview, curriculum manager, and learner results."""

from typing import Any
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models.progress import Progress
from app.models.task import Task
from app.models.topic import Topic
from app.models.user import User
from app.schemas.admin import AdminOverview, AdminStudentItem, AdminSubmissionItem
from app.schemas.task import TaskRead
from app.schemas.topic import TopicRead

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=AdminOverview)
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> AdminOverview:
    """Return aggregated platform numbers."""
    total_students = (
        await db.scalar(select(func.count(User.id)).where(User.is_admin.is_(False)))
    ) or 0
    total_topics = (await db.scalar(select(func.count(Topic.id)))) or 0
    total_tasks = (await db.scalar(select(func.count(Task.id)))) or 0
    total_submissions = (await db.scalar(select(func.count(Progress.id)))) or 0
    avg_score = (await db.scalar(select(func.avg(Progress.score)))) or 0.0

    return AdminOverview(
        total_students=total_students,
        total_topics=total_topics,
        total_tasks=total_tasks,
        total_submissions=total_submissions,
        average_score=round(float(avg_score), 1),
    )


@router.get("/submissions", response_model=list[AdminSubmissionItem])
async def list_admin_submissions(
    student_id: uuid.UUID | None = Query(default=None),
    topic_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> list[AdminSubmissionItem]:
    """Return learner exercise completions with grades and AI feedback."""
    stmt = (
        select(
            Progress,
            User.username,
            User.email,
            User.level,
            Topic.title,
            Topic.level,
            Task.type,
            Task.content,
        )
        .join(User, Progress.user_id == User.id)
        .join(Topic, Progress.topic_id == Topic.id)
        .join(Task, Progress.task_id == Task.id)
        .order_by(Progress.completed_at.desc())
        .limit(limit)
    )

    if student_id is not None:
        stmt = stmt.where(Progress.user_id == student_id)
    if topic_id is not None:
        stmt = stmt.where(Progress.topic_id == topic_id)

    rows = (await db.execute(stmt)).all()

    items: list[AdminSubmissionItem] = []
    for (
        progress,
        username,
        email,
        student_level,
        topic_title,
        topic_level,
        task_type,
        task_content,
    ) in rows:
        task_title = (task_content or {}).get("title") or f"{task_type.value} задание"
        items.append(
            AdminSubmissionItem(
                id=progress.id,
                user_id=progress.user_id,
                student_name=username,
                student_email=email,
                student_level=student_level,
                topic_id=progress.topic_id,
                topic_title=topic_title,
                topic_level=topic_level,
                task_id=progress.task_id,
                task_type=task_type,
                task_title=task_title,
                score=progress.score,
                ai_feedback=progress.ai_feedback,
                completed_at=progress.completed_at,
            )
        )
    return items


@router.get("/students", response_model=list[AdminStudentItem])
async def list_admin_students(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> list[AdminStudentItem]:
    """Return all registered students with their completion stats."""
    students = list(
        (
            await db.execute(
                select(User).where(User.is_admin.is_(False)).order_by(User.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    items: list[AdminStudentItem] = []
    for s in students:
        stats = (
            await db.execute(
                select(func.count(Progress.id), func.avg(Progress.score)).where(
                    Progress.user_id == s.id
                )
            )
        ).first()

        completed_count = stats[0] if stats and stats[0] else 0
        avg_score = float(stats[1]) if stats and stats[1] is not None else 0.0

        items.append(
            AdminStudentItem(
                id=s.id,
                username=s.username,
                email=s.email,
                level=s.level,
                created_at=s.created_at,
                is_first_login=s.is_first_login,
                completed_count=completed_count,
                average_score=round(avg_score, 1),
            )
        )
    return items


@router.get("/topics-with-tasks")
async def list_topics_with_tasks(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> list[dict[str, Any]]:
    """Return all curriculum topics with full un-sanitized tasks for editing."""
    topics = list(
        (await db.execute(select(Topic).order_by(Topic.level, Topic.title)))
        .scalars()
        .all()
    )
    result = []
    for t in topics:
        tasks = list(
            (await db.execute(select(Task).where(Task.topic_id == t.id)))
            .scalars()
            .all()
        )
        tasks.sort(
            key=lambda item: (
                int((item.content or {}).get("order", 999)),
                item.type.value,
                str(item.id),
            )
        )
        result.append(
            {
                "topic": TopicRead.model_validate(t).model_dump(),
                "tasks": [TaskRead.model_validate(task).model_dump() for task in tasks],
            }
        )
    return result
