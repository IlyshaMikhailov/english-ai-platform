"""Domain enums shared by ORM models and API schemas."""

import enum


class EnglishLevel(str, enum.Enum):
    """CEFR English proficiency levels supported by the platform."""

    A2 = "A2"
    B1 = "B1"
    B2 = "B2"


class TaskType(str, enum.Enum):
    """Supported interactive and creative task types."""

    test = "test"
    gamified = "gamified"
    essay = "essay"
