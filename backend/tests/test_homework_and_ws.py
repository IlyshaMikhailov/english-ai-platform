"""Tests for homework evaluation, onboarding chat fallback, and Socratic WebSocket."""

from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.session import get_db
from app.main import app
from app.schemas.ai import EssayErrorItem, EssayEvaluationResponse
from app.services.llm_service import (
    LLMConnectionError,
    LLMResponseParseError,
    get_llm_service,
)


class FakeSuccessLLMService:
    """Stub LLMService returning deterministic essay evaluations and Socratic chunks."""

    async def evaluate_essay(self, essay_text, level, task_prompt=None):
        return EssayEvaluationResponse(
            score=9,
            errors=[
                EssayErrorItem(
                    sentence="I goes home.",
                    correction="I go home.",
                    explanation="First-person singular uses base verb 'go'.",
                )
            ],
            feedback="Very clear essay with one small verb agreement mistake.",
        )

    async def generate_onboarding_reply(self, user_message, username, level, history=None):
        return f"Привет, {username}! Открой тему на главной и выбери видео или слайды."

    async def stream_onboarding_reply(self, user_message, username, level, history=None):
        for piece in ["Откройте тему ", "во вкладке «Модули»."]:
            yield piece

    async def stream_socratic_reply(self, task_context, history, student_message):
        for piece in ["Think about ", "the subject 'she'. ", "What ending fits?"]:
            yield piece

    async def analyze_task_mistakes(
        self, task_title, level, mistake_details, correct_count, total_count
    ):
        return (
            "Обратите внимание на 3-е лицо единственного числа (she): "
            "глагол в Present Simple получает окончание -s."
        )


class FakeFailingLLMService:
    """Stub LLMService simulating Ollama downtime or malformed responses."""

    def __init__(self, exc: Exception) -> None:
        self.exc = exc

    async def evaluate_essay(self, essay_text, level, task_prompt=None):
        raise self.exc

    async def generate_onboarding_reply(self, user_message, username, level, history=None):
        raise self.exc

    async def stream_onboarding_reply(self, user_message, username, level, history=None):
        raise self.exc
        yield ""  # pragma: no cover

    async def stream_socratic_reply(self, task_context, history, student_message):
        raise self.exc
        yield ""  # pragma: no cover

    async def analyze_task_mistakes(
        self, task_title, level, mistake_details, correct_count, total_count
    ):
        raise self.exc


async def _register_and_create_essay_task(async_client):
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "charlie",
            "email": "charlie@example.com",
            "password": "password123",
            "level": "B1",
        },
    )
    reg_data = reg_res.json()
    headers = {"Authorization": f"Bearer {reg_data['access_token']}"}

    topic_res = await async_client.post(
        "/api/v1/topics",
        headers=headers,
        json={
            "title": "Essay Practice Topic",
            "description": "Writing practice",
            "level": "B1",
        },
    )
    topic_id = topic_res.json()["id"]

    essay_task_res = await async_client.post(
        f"/api/v1/topics/{topic_id}/tasks",
        headers=headers,
        json={
            "type": "essay",
            "content": {
                "title": "Daily Routine",
                "prompt": "Describe your typical day.",
                "min_words": 20,
                "max_words": 200,
            },
        },
    )
    test_task_res = await async_client.post(
        f"/api/v1/topics/{topic_id}/tasks",
        headers=headers,
        json={
            "type": "test",
            "content": {
                "question": "She ___ tea.",
                "options": ["drink", "drinks"],
                "correct_answer": "drinks",
            },
        },
    )
    return (
        reg_data["user"],
        reg_data["access_token"],
        headers,
        essay_task_res.json()["id"],
        test_task_res.json()["id"],
    )


@pytest.mark.asyncio
async def test_homework_evaluate_success_and_validation(async_client):
    _, _, headers, essay_task_id, _ = await _register_and_create_essay_task(
        async_client
    )

    app.dependency_overrides[get_llm_service] = lambda: FakeSuccessLLMService()
    try:
        bad_ext = await async_client.post(
            "/api/v1/homework/evaluate",
            headers=headers,
            files={"file": ("essay.pdf", b"%PDF-1.4", "application/pdf")},
        )
        assert bad_ext.status_code == 400

        empty_txt = await async_client.post(
            "/api/v1/homework/evaluate",
            headers=headers,
            files={"file": ("essay.txt", b"   \n  ", "text/plain")},
        )
        assert empty_txt.status_code == 400

        ok_res = await async_client.post(
            "/api/v1/homework/evaluate",
            headers=headers,
            data={"task_id": essay_task_id},
            files={
                "file": (
                    "essay.txt",
                    b"I goes home after school and study English.",
                    "text/plain",
                )
            },
        )
        assert ok_res.status_code == 200
        body = ok_res.json()
        assert body["score"] == 9
        assert len(body["errors"]) == 1
        assert body["progress_id"] is not None
    finally:
        app.dependency_overrides.pop(get_llm_service, None)


@pytest.mark.asyncio
async def test_homework_evaluate_handles_llm_failures_and_onboarding_fallback(
    async_client,
):
    _, _, headers, _, _ = await _register_and_create_essay_task(async_client)

    app.dependency_overrides[get_llm_service] = lambda: FakeFailingLLMService(
        LLMConnectionError("Ollama offline")
    )
    try:
        conn_fail = await async_client.post(
            "/api/v1/homework/evaluate",
            headers=headers,
            files={"file": ("essay.txt", b"Hello world essay text.", "text/plain")},
        )
        assert conn_fail.status_code == 503

        # Onboarding chat should degrade gracefully rather than failing.
        onb_res = await async_client.post(
            "/api/v1/onboarding/chat",
            headers=headers,
            json={"message": "Где найти теорию?"},
        )
        assert onb_res.status_code == 200
        assert onb_res.json()["is_fallback"] is True

        # Streaming endpoint should emit fallback exactly once + done marker.
        stream_fallback = await async_client.post(
            "/api/v1/onboarding/chat/stream",
            headers=headers,
            json={"message": "Где найти теорию?"},
        )
        assert stream_fallback.status_code == 200
        lines = [line for line in stream_fallback.text.splitlines() if line.strip()]
        assert len(lines) == 2
        assert '"is_fallback": true' in lines[0]
        assert '"done": true' in lines[1]
    finally:
        app.dependency_overrides.pop(get_llm_service, None)

    app.dependency_overrides[get_llm_service] = lambda: FakeSuccessLLMService()
    try:
        stream_ok = await async_client.post(
            "/api/v1/onboarding/chat/stream",
            headers=headers,
            json={"message": "Где найти теорию?"},
        )
        assert stream_ok.status_code == 200
        ok_lines = [line for line in stream_ok.text.splitlines() if line.strip()]
        assert len(ok_lines) == 3
        assert '"Откройте тему "' in ok_lines[0]
    finally:
        app.dependency_overrides.pop(get_llm_service, None)

    app.dependency_overrides[get_llm_service] = lambda: FakeFailingLLMService(
        LLMResponseParseError("Bad JSON")
    )
    try:
        parse_fail = await async_client.post(
            "/api/v1/homework/evaluate",
            headers=headers,
            files={"file": ("essay.txt", b"Hello world essay text.", "text/plain")},
        )
        assert parse_fail.status_code == 502
    finally:
        app.dependency_overrides.pop(get_llm_service, None)


@pytest.mark.asyncio
async def test_socratic_websocket_streams_persists_and_resets_history(
    async_engine, async_client
):
    user, token, _, _, test_task_id = await _register_and_create_essay_task(
        async_client
    )

    session_factory = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_llm_service] = lambda: FakeSuccessLLMService()
    try:
        ws_url = f"/ws/tutor/{user['id']}/{test_task_id}?token={token}"
        with TestClient(app) as client:
            with client.websocket_connect(ws_url) as ws:
                init_msg = ws.receive_json()
                assert init_msg == {"type": "history", "messages": []}

                ws.send_json({"message": "I chose drink", "wrong_answer": "drink"})
                assert ws.receive_json() == {"type": "start"}

                chunks = []
                while True:
                    frame = ws.receive_json()
                    if frame["type"] == "chunk":
                        chunks.append(frame["content"])
                    elif frame["type"] == "end":
                        assert frame["content"] == "".join(chunks)
                        break
                    else:
                        raise AssertionError(f"Unexpected frame: {frame}")

                assert "subject 'she'" in "".join(chunks)

            # Reconnect and verify conversation history was persisted in chat_sessions.
            with client.websocket_connect(ws_url) as ws:
                history_msg = ws.receive_json()
                assert history_msg["type"] == "history"
                assert len(history_msg["messages"]) == 2
                assert history_msg["messages"][0]["role"] == "user"
                assert history_msg["messages"][1]["role"] == "assistant"

                ws.send_json({"type": "reset"})
                reset_msg = ws.receive_json()
                assert reset_msg == {"type": "history", "messages": []}
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_task_ai_review_success_and_fallback(async_client):
    _, _, headers, _, test_task_id = await _register_and_create_essay_task(
        async_client
    )

    app.dependency_overrides[get_llm_service] = lambda: FakeSuccessLLMService()
    try:
        review_ok = await async_client.post(
            f"/api/v1/tasks/{test_task_id}/ai-review",
            headers=headers,
            json={"answer": "drink"},
        )
        assert review_ok.status_code == 200
        body = review_ok.json()
        assert body["is_fallback"] is False
        assert "Present Simple" in body["analysis"]
        assert len(body["wrong_items"]) == 1
    finally:
        app.dependency_overrides.pop(get_llm_service, None)

    app.dependency_overrides[get_llm_service] = lambda: FakeFailingLLMService(
        LLMConnectionError("Ollama down")
    )
    try:
        review_fallback = await async_client.post(
            f"/api/v1/tasks/{test_task_id}/ai-review",
            headers=headers,
            json={"answer": "drink"},
        )
        assert review_fallback.status_code == 200
        body = review_fallback.json()
        assert body["is_fallback"] is True
        assert "She ___ tea." in body["analysis"]
    finally:
        app.dependency_overrides.pop(get_llm_service, None)


@pytest.mark.asyncio
async def test_socratic_websocket_handles_llm_error_without_dropping(
    async_engine, async_client
):
    user, token, _, _, test_task_id = await _register_and_create_essay_task(
        async_client
    )

    session_factory = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_llm_service] = lambda: FakeFailingLLMService(
        LLMConnectionError("Ollama disconnected")
    )
    try:
        ws_url = f"/ws/tutor/{user['id']}/{test_task_id}?token={token}"
        with TestClient(app) as client:
            with client.websocket_connect(ws_url) as ws:
                assert ws.receive_json() == {"type": "history", "messages": []}
                ws.send_text("Help me")
                assert ws.receive_json() == {"type": "start"}
                err_frame = ws.receive_json()
                assert err_frame["type"] == "error"
                assert "Ollama disconnected" in err_frame["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_task_ai_review_success_and_fallback(async_client):
    _, _, headers, _, test_task_id = await _register_and_create_essay_task(
        async_client
    )

    app.dependency_overrides[get_llm_service] = lambda: FakeSuccessLLMService()
    try:
        review_ok = await async_client.post(
            f"/api/v1/tasks/{test_task_id}/ai-review",
            headers=headers,
            json={"answer": "drink"},
        )
        assert review_ok.status_code == 200
        body = review_ok.json()
        assert body["is_fallback"] is False
        assert "Present Simple" in body["analysis"]
        assert len(body["wrong_items"]) == 1
    finally:
        app.dependency_overrides.pop(get_llm_service, None)

    app.dependency_overrides[get_llm_service] = lambda: FakeFailingLLMService(
        LLMConnectionError("Ollama down")
    )
    try:
        review_fallback = await async_client.post(
            f"/api/v1/tasks/{test_task_id}/ai-review",
            headers=headers,
            json={"answer": "drink"},
        )
        assert review_fallback.status_code == 200
        body = review_fallback.json()
        assert body["is_fallback"] is True
        assert "She ___ tea." in body["analysis"]
    finally:
        app.dependency_overrides.pop(get_llm_service, None)
