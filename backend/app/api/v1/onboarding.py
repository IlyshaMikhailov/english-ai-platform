"""AI onboarding guide chat endpoints (REST and streaming)."""

from collections.abc import AsyncGenerator
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.ai import OnboardingChatRequest, OnboardingChatResponse
from app.services.llm_service import LLMService, LLMServiceError, get_llm_service

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

DEFAULT_FALLBACK_GUIDE = (
    "Вот краткая подсказка по платформе:\n"
    "1. В разделе «Модули» выберите тему вашего уровня.\n"
    "2. Внутри темы откройте «Теория и материалы», затем перейдите во вкладку «Практика».\n"
    "3. Оценки и историю попыток можно смотреть в разделе «Профиль»."
)


@router.post("/chat", response_model=OnboardingChatResponse)
async def onboarding_chat(
    payload: OnboardingChatRequest,
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(get_llm_service),
) -> OnboardingChatResponse:
    """Generate an onboarding guide reply using Ollama with graceful fallback."""
    history = [item.model_dump() for item in payload.history]
    try:
        reply = await llm_service.generate_onboarding_reply(
            user_message=payload.message,
            username=current_user.username,
            level=current_user.level,
            history=history,
        )
        return OnboardingChatResponse(reply=reply, is_fallback=False)
    except LLMServiceError:
        return OnboardingChatResponse(
            reply=DEFAULT_FALLBACK_GUIDE,
            is_fallback=True,
        )


@router.post("/chat/stream")
async def onboarding_chat_stream(
    payload: OnboardingChatRequest,
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(get_llm_service),
) -> StreamingResponse:
    """Stream onboarding guide tokens as NDJSON with graceful fallback."""
    history = [item.model_dump() for item in payload.history]

    async def event_stream() -> AsyncGenerator[str, None]:
        emitted = False
        try:
            async for chunk in llm_service.stream_onboarding_reply(
                user_message=payload.message,
                username=current_user.username,
                level=current_user.level,
                history=history,
            ):
                emitted = True
                yield json.dumps({"chunk": chunk}, ensure_ascii=False) + "\n"
        except LLMServiceError:
            if not emitted:
                emitted = True
                yield json.dumps(
                    {"chunk": DEFAULT_FALLBACK_GUIDE, "is_fallback": True},
                    ensure_ascii=False,
                ) + "\n"
        if not emitted:
            yield json.dumps(
                {"chunk": DEFAULT_FALLBACK_GUIDE, "is_fallback": True},
                ensure_ascii=False,
            ) + "\n"
        yield json.dumps({"done": True}) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
    )
