"""Unit and network-resilience mock tests for LLMService (Ollama client)."""

import json

import httpx
import pytest

from app.models.enums import EnglishLevel
from app.services.llm_service import (
    LLMConnectionError,
    LLMResponseParseError,
    LLMService,
)


def _mock_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://mock-ollama:11434",
    )


@pytest.mark.asyncio
async def test_evaluate_essay_parses_fenced_json_and_clamps_score():
    payload = {
        "score": 15,
        "errors": [
            {
                "sentence": "She go to school.",
                "correction": "She goes to school.",
                "explanation": "Third person singular requires -es.",
            }
        ],
        "feedback": "Good effort, watch verb endings.",
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/chat"
        body = json.loads(request.content.decode("utf-8"))
        assert body["format"] == "json"
        assert "B1" in body["messages"][0]["content"]
        return httpx.Response(
            200,
            json={"message": {"content": f"```json\n{json.dumps(payload)}\n```"}},
        )

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        result = await service.evaluate_essay("She go to school.", EnglishLevel.B1)

    assert result.score == 10
    assert len(result.errors) == 1
    assert result.errors[0].correction == "She goes to school."
    assert result.feedback == "Good effort, watch verb endings."


@pytest.mark.asyncio
async def test_evaluate_essay_rejects_malformed_non_json_response():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"message": {"content": "Your essay is great, score 9 out of 10!"}},
        )

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        with pytest.raises(LLMResponseParseError):
            await service.evaluate_essay("Sample essay text.", EnglishLevel.A2)


@pytest.mark.asyncio
async def test_evaluate_essay_rejects_incomplete_json_schema():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"message": {"content": '{"score": 7, "errors": []}'}},
        )

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        with pytest.raises(LLMResponseParseError):
            await service.evaluate_essay("Sample essay text.", EnglishLevel.A2)


@pytest.mark.asyncio
async def test_evaluate_essay_rejects_empty_llm_content():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"message": {"content": "   "}})

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        with pytest.raises(LLMResponseParseError):
            await service.evaluate_essay("Sample essay text.", EnglishLevel.B2)


@pytest.mark.asyncio
async def test_chat_once_handles_timeout():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Simulated Ollama timeout", request=request)

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        with pytest.raises(LLMConnectionError, match="timed out"):
            await service.chat_once([{"role": "user", "content": "Hello"}])


@pytest.mark.asyncio
async def test_chat_once_handles_connection_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused", request=request)

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        with pytest.raises(LLMConnectionError, match="Failed to connect"):
            await service.chat_once([{"role": "user", "content": "Hello"}])


@pytest.mark.asyncio
async def test_chat_once_handles_http_500_status():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "model crashed"})

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        with pytest.raises(LLMConnectionError, match="HTTP 500"):
            await service.chat_once([{"role": "user", "content": "Hello"}])


@pytest.mark.asyncio
async def test_stream_chat_yields_chunks_and_detects_corrupt_stream():
    valid_stream = (
        '{"message":{"content":"What "},"done":false}\n'
        '{"message":{"content":"tense?"},"done":false}\n'
        '{"message":{"content":""},"done":true}\n'
    )

    def ok_handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=valid_stream)

    async with _mock_client(ok_handler) as client:
        service = LLMService(client=client)
        chunks = [
            chunk
            async for chunk in service.stream_socratic_reply(
                task_context="[Question: She ___ coffee]",
                history=[],
                student_message="drink",
            )
        ]
    assert chunks == ["What ", "tense?"]

    def bad_stream_handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text='{"message":{"content":"Hi"}}\n{corrupt-json')

    async with _mock_client(bad_stream_handler) as client:
        service = LLMService(client=client)
        with pytest.raises(LLMResponseParseError):
            async for _ in service.stream_chat([{"role": "user", "content": "hi"}]):
                pass


@pytest.mark.asyncio
async def test_evaluate_essay_strips_think_tags_from_reasoning_models():
    payload = {
        "score": 8,
        "errors": [],
        "feedback": "Хорошая структура, продолжайте в том же духе.",
    }

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "message": {
                    "content": f"<think>Analyzing essay grammar carefully...</think>{json.dumps(payload)}"
                }
            },
        )

    async with _mock_client(handler) as client:
        service = LLMService(client=client)
        result = await service.evaluate_essay("She always helps friends.", EnglishLevel.A2)

    assert result.score == 8
    assert "Хорошая структура" in result.feedback
