"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import admin, auth, homework, onboarding, tasks, topics, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(topics.router)
api_router.include_router(tasks.router)
api_router.include_router(homework.router)
api_router.include_router(onboarding.router)
api_router.include_router(admin.router)
