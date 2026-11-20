"""WebSocket endpoint for real-time Socratic AI tutoring."""

import json
import uuid

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.chat_session import ChatSession
from app.models.enums import TaskType
from app.models.task import Task
from app.models.user import User
from app.services.llm_service import (
    LLMService,
    LLMServiceError,
    get_llm_service,
)

ws_router = APIRouter(tags=["tutor-ws"])


def build_task_context(task: Task, wrong_answer: str | None = None) -> str:
    """Format task details into structured context for the Socratic tutor prompt."""
    content = task.content or {}
    parts: list[str] = []

    if task.topic is not None:
        parts.append(f"Тема: {task.topic.title} (уровень {task.topic.level.value})")

    parts.append(f"Тип задания: {task.type.value}")

    if task.type == TaskType.test:
        questions = content.get("questions")
        if isinstance(questions, list) and questions:
            items_summary = " | ".join(
                f"{q.get('id')}: {q.get('question')} [Ответ: {q.get('correct_answer')}]"
                for q in questions
            )
            parts.append(
                f"Набор вопросов (НЕ раскрывай ответы напрямую): {items_summary}"
            )
        else:
            parts.append(f"Вопрос: {content.get('question', '')}")
            options = content.get("options") or []
            if options:
                parts.append(f"Варианты ответа: {', '.join(map(str, options))}")
            parts.append(
                f"Эталонный ответ (НЕ раскрывай ученику напрямую): {content.get('correct_answer', '')}"
            )
            if content.get("explanation"):
                parts.append(f"Правило: {content['explanation']}")
    elif task.type == TaskType.gamified:
        if content.get("mode") == "matching":
            pairs_summary = " | ".join(
                f"{p.get('word')} = {p.get('description')}"
                for p in (content.get("pairs") or [])
            )
            parts.append(
                f"Сопоставление слов и картинок (НЕ раскрывай ответы напрямую): {pairs_summary}"
            )
        else:
            parts.append(f"Инструкция: {content.get('instruction', '')}")
            words = content.get("words") or []
            if words:
                parts.append(f"Слова: {', '.join(map(str, words))}")
            parts.append(
                f"Эталонное предложение (НЕ раскрывай ученику напрямую): {content.get('correct_sentence', '')}"
            )
            if content.get("hint"):
                parts.append(f"Подсказка: {content['hint']}")
    else:
        parts.append(f"Задание на письмо: {content.get('prompt', '')}")

    if wrong_answer:
        parts.append(f"Ошибочный ответ ученика: {wrong_answer}")

    return "[" + "; ".join(parts) + "]"


def _parse_client_payload(raw_text: str) -> tuple[str, str, str | None]:
    """Parse raw text or JSON payload sent by a WebSocket client."""
    stripped = raw_text.strip()
    if stripped.startswith("{"):
        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError:
            return "chat", stripped, None
        if isinstance(payload, dict):
            if payload.get("type") == "reset":
                return "reset", "", None
            message = str(
                payload.get("message")
                or payload.get("content")
                or payload.get("text")
                or ""
            ).strip()
            wrong_answer = payload.get("wrong_answer")
            return (
                "chat",
                message,
                str(wrong_answer).strip() if wrong_answer is not None else None,
            )
    return "chat", stripped, None


async def _get_or_create_chat_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    task_id: uuid.UUID,
) -> ChatSession:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.user_id == user_id,
            ChatSession.task_id == task_id,
        )
    )
    chat_session = result.scalar_one_or_none()
    if chat_session is None:
        chat_session = ChatSession(user_id=user_id, task_id=task_id, history=[])
        db.add(chat_session)
        await db.commit()
        await db.refresh(chat_session)
    return chat_session


@ws_router.websocket("/ws/tutor/{user_id}/{task_id}")
async def socratic_tutor_websocket(
    websocket: WebSocket,
    user_id: uuid.UUID,
    task_id: uuid.UUID,
    token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    llm_service: LLMService = Depends(get_llm_service),
) -> None:
    """Bidirectional WebSocket channel for Socratic tutoring with saved history."""
    if token is not None:
        try:
            claims = decode_access_token(token)
            if str(claims.get("sub")) != str(user_id):
                await websocket.close(
                    code=status.WS_1008_POLICY_VIOLATION,
                    reason="Token subject does not match user_id.",
                )
                return
        except ValueError:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Invalid authentication token.",
            )
            return

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="User not found.",
        )
        return

    task_result = await db.execute(
        select(Task).options(selectinload(Task.topic)).where(Task.id == task_id)
    )
    task = task_result.scalar_one_or_none()
    if task is None:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Task not found.",
        )
        return

    chat_session = await _get_or_create_chat_session(db, user_id, task_id)
    history: list[dict[str, str]] = list(chat_session.history or [])

    await websocket.accept()
    await websocket.send_json({"type": "history", "messages": history})

    try:
        while True:
            raw_message = await websocket.receive_text()
            action, student_message, wrong_answer = _parse_client_payload(raw_message)

            if action == "reset":
                history = []
                chat_session.history = []
                flag_modified(chat_session, "history")
                await db.commit()
                await websocket.send_json({"type": "history", "messages": []})
                continue

            if not student_message:
                await websocket.send_json(
                    {"type": "error", "detail": "Message cannot be empty."}
                )
                continue

            task_context = build_task_context(task, wrong_answer=wrong_answer)
            await websocket.send_json({"type": "start"})

            chunks: list[str] = []
            try:
                async for token_chunk in llm_service.stream_socratic_reply(
                    task_context=task_context,
                    history=history,
                    student_message=student_message,
                ):
                    chunks.append(token_chunk)
                    await websocket.send_json(
                        {"type": "chunk", "content": token_chunk}
                    )
            except LLMServiceError as exc:
                await websocket.send_json(
                    {
                        "type": "error",
                        "detail": f"AI tutor is temporarily unavailable: {exc}",
                    }
                )
                continue

            full_reply = "".join(chunks).strip()
            if not full_reply:
                await websocket.send_json(
                    {
                        "type": "error",
                        "detail": "AI tutor returned an empty response.",
                    }
                )
                continue

            history = [
                *history,
                {"role": "user", "content": student_message},
                {"role": "assistant", "content": full_reply},
            ]
            chat_session.history = history
            flag_modified(chat_session, "history")
            await db.commit()

            await websocket.send_json({"type": "end", "content": full_reply})
    except WebSocketDisconnect:
        return
