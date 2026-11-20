"""Topics and learning materials CRUD + topic tasks endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import EnglishLevel
from app.models.task import Task
from app.models.topic import Topic
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskPracticeRead,
    TaskRead,
    sanitize_task_content,
)
from app.schemas.topic import TopicCreate, TopicRead, TopicUpdate

router = APIRouter(prefix="/topics", tags=["topics"])


async def _get_topic_or_404(db: AsyncSession, topic_id: uuid.UUID) -> Topic:
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found.",
        )
    return topic


@router.get("", response_model=list[TopicRead])
async def list_topics(
    level: EnglishLevel | None = Query(default=None),
    all_levels: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TopicRead]:
    """List topics matching the learner's level (or an explicit filter)."""
    stmt = select(Topic).order_by(Topic.level, Topic.title)
    if not all_levels:
        target_level = level or current_user.level
        stmt = stmt.where(Topic.level == target_level)

    topics = (await db.execute(stmt)).scalars().all()
    return [TopicRead.model_validate(topic) for topic in topics]


@router.post("", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def create_topic(
    payload: TopicCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TopicRead:
    """Create a new learning topic."""
    topic = Topic(**payload.model_dump())
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return TopicRead.model_validate(topic)


@router.get("/{topic_id}", response_model=TopicRead)
async def get_topic(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TopicRead:
    """Return topic details including video and presentation URLs."""
    topic = await _get_topic_or_404(db, topic_id)
    return TopicRead.model_validate(topic)


@router.put("/{topic_id}", response_model=TopicRead)
async def replace_topic(
    topic_id: uuid.UUID,
    payload: TopicCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TopicRead:
    """Replace all fields of an existing topic."""
    topic = await _get_topic_or_404(db, topic_id)
    for field, value in payload.model_dump().items():
        setattr(topic, field, value)
    await db.commit()
    await db.refresh(topic)
    return TopicRead.model_validate(topic)


@router.patch("/{topic_id}", response_model=TopicRead)
async def update_topic(
    topic_id: uuid.UUID,
    payload: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TopicRead:
    """Partially update an existing topic."""
    topic = await _get_topic_or_404(db, topic_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    await db.commit()
    await db.refresh(topic)
    return TopicRead.model_validate(topic)


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    """Delete a topic and its associated tasks."""
    topic = await _get_topic_or_404(db, topic_id)
    await db.delete(topic)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{topic_id}/tasks", response_model=list[TaskPracticeRead])
async def list_topic_tasks(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[TaskPracticeRead]:
    """Return sanitized practice tasks (test, gamified, essay) for a topic."""
    await _get_topic_or_404(db, topic_id)
    stmt = select(Task).where(Task.topic_id == topic_id)
    tasks = list((await db.execute(stmt)).scalars().all())
    tasks.sort(
        key=lambda task: (
            int((task.content or {}).get("order", 999)),
            task.type.value,
            str(task.id),
        )
    )
    return [
        TaskPracticeRead(
            id=task.id,
            topic_id=task.topic_id,
            type=task.type,
            content=sanitize_task_content(task.type, task.content),
        )
        for task in tasks
    ]


@router.post(
    "/{topic_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_topic_task(
    topic_id: uuid.UUID,
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TaskRead:
    """Create a validated practice task under a topic."""
    await _get_topic_or_404(db, topic_id)
    task = Task(
        topic_id=topic_id,
        type=payload.type,
        content=payload.content,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskRead.model_validate(task)
