"""Initial database schema for users, topics, tasks, progress, and chat_sessions.

Revision ID: 20261110_0001
Revises:
Create Date: 2026-11-10 23:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261110_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

english_level_enum = postgresql.ENUM(
    "A2",
    "B1",
    "B2",
    name="english_level",
    create_type=False,
)
task_type_enum = postgresql.ENUM(
    "test",
    "gamified",
    "essay",
    name="task_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("A2", "B1", "B2", name="english_level").create(
        bind, checkfirst=True
    )
    postgresql.ENUM("test", "gamified", "essay", name="task_type").create(
        bind, checkfirst=True
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column(
            "level",
            english_level_enum,
            server_default="A2",
            nullable=False,
        ),
        sa.Column(
            "is_first_login",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("video_url", sa.String(length=512), nullable=True),
        sa.Column("presentation_url", sa.String(length=512), nullable=True),
        sa.Column("level", english_level_enum, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_topics"),
    )
    op.create_index("ix_topics_level", "topics", ["level"], unique=False)

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", task_type_enum, nullable=False),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(
            ["topic_id"],
            ["topics.id"],
            name="fk_tasks_topic_id_topics",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_tasks"),
    )
    op.create_index("ix_tasks_topic_id", "tasks", ["topic_id"], unique=False)

    op.create_table(
        "progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column(
            "ai_feedback", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            name="fk_progress_task_id_tasks",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["topic_id"],
            ["topics.id"],
            name="fk_progress_topic_id_topics",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_progress_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_progress"),
    )
    op.create_index("ix_progress_task_id", "progress", ["task_id"], unique=False)
    op.create_index("ix_progress_topic_id", "progress", ["topic_id"], unique=False)
    op.create_index("ix_progress_user_id", "progress", ["user_id"], unique=False)

    op.create_table(
        "chat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "history",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            name="fk_chat_sessions_task_id_tasks",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_chat_sessions_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_chat_sessions"),
        sa.UniqueConstraint(
            "user_id", "task_id", name="uq_chat_sessions_user_task"
        ),
    )
    op.create_index(
        "ix_chat_sessions_task_id", "chat_sessions", ["task_id"], unique=False
    )
    op.create_index(
        "ix_chat_sessions_user_id", "chat_sessions", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_chat_sessions_user_id", table_name="chat_sessions")
    op.drop_index("ix_chat_sessions_task_id", table_name="chat_sessions")
    op.drop_table("chat_sessions")

    op.drop_index("ix_progress_user_id", table_name="progress")
    op.drop_index("ix_progress_topic_id", table_name="progress")
    op.drop_index("ix_progress_task_id", table_name="progress")
    op.drop_table("progress")

    op.drop_index("ix_tasks_topic_id", table_name="tasks")
    op.drop_table("tasks")

    op.drop_index("ix_topics_level", table_name="topics")
    op.drop_table("topics")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    postgresql.ENUM("test", "gamified", "essay", name="task_type").drop(
        bind, checkfirst=True
    )
    postgresql.ENUM("A2", "B1", "B2", name="english_level").drop(
        bind, checkfirst=True
    )
