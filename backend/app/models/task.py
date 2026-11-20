"""Task ORM model."""

from typing import TYPE_CHECKING, Any
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import TaskType

if TYPE_CHECKING:
    from app.models.chat_session import ChatSession
    from app.models.progress import Progress
    from app.models.topic import Topic


class Task(Base):
    """Interactive task belonging to a learning topic."""

    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[TaskType] = mapped_column(
        SAEnum(
            TaskType,
            name="task_type",
            values_callable=lambda obj: [member.value for member in obj],
        ),
        nullable=False,
    )
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    topic: Mapped["Topic"] = relationship(back_populates="tasks")
    progress_records: Mapped[list["Progress"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
