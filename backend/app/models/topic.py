"""Topic ORM model."""

from typing import TYPE_CHECKING
import uuid

from sqlalchemy import Enum as SAEnum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EnglishLevel

if TYPE_CHECKING:
    from app.models.progress import Progress
    from app.models.task import Task


class Topic(Base):
    """Learning module containing theory links and practice tasks."""

    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    video_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    presentation_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    level: Mapped[EnglishLevel] = mapped_column(
        SAEnum(
            EnglishLevel,
            name="english_level",
            values_callable=lambda obj: [member.value for member in obj],
        ),
        nullable=False,
        index=True,
    )

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
    progress_records: Mapped[list["Progress"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
