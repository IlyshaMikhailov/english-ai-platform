"""Add is_admin column to users table.

Revision ID: 20261113_0002
Revises: 20261110_0001
Create Date: 2026-11-13 14:20:00
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261113_0002"
down_revision: Union[str, Sequence[str], None] = "20261110_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
