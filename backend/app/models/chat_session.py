"""ChatSession ORM model."""

from typing import TYPE_CHECKING, Any
import uuid

from sqlalchemy import ForeignKey, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User


class ChatSession(Base):
    """Persisted Socratic dialogue history per user and task."""

    __tablename__ = "chat_sessions"
    __table_args__ = (
        UniqueConstraint("user_id", "task_id", name="uq_chat_sessions_user_task"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    history: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )

    user: Mapped["User"] = relationship(back_populates="chat_sessions")
    task: Mapped["Task"] = relationship(back_populates="chat_sessions")
