"""Async Ollama LLM service layer for onboarding, Socratic tutoring, and essay grading."""

from collections.abc import AsyncGenerator
import json
import re
from typing import Any

import httpx

from app.core.config import settings
from app.models.enums import EnglishLevel
from app.schemas.ai import EssayEvaluationResponse

ONBOARDING_SYSTEM_PROMPT = (
    "Ты приветливый гид по образовательной платформе. "
    "Коротко и ясно объясни пользователю, где найти теорию, как решать задания "
    "и где смотреть свой прогресс."
)

SOCRATIC_TUTOR_PROMPT_TEMPLATE = (
    "Ты опытный методист и репетитор английского языка. "
    "Ученик совершил ошибку в задании {task_context}.\n"
    "Правила работы:\n"
    "1. Внимательно проанализируй смысл задания и причину ошибки ученика.\n"
    "2. НИКОГДА не называй правильный ответ напрямую.\n"
    "3. Разбирай строго по одной ошибке за один шаг.\n"
    "4. Дай короткую содержательную подсказку (про правило грамматики, вопрос или значение слова) "
    "и задай один точный наводящий вопрос на русском языке, чтобы ученик сам догадался.\n"
    "5. Отвечай живо, структурированно и кратко (2–4 предложения)."
)

ESSAY_EVALUATOR_PROMPT_TEMPLATE = (
    "Ты строгий, но доброжелательный преподаватель английского языка. "
    "Внимательно проанализируй текст ученика уровня {level} по четырём критериям: "
    "грамматика, орфография, выбор лексики и соответствие заданию/смыслу.\n"
    "Найди все реальные ошибки (если ошибок нет, верни пустой список errors), "
    "для каждой ошибки напиши исправленный вариант и понятное объяснение правила на русском языке. "
    "В поле feedback дай развёрнутый конструктивный комментарий на русском языке с похвалой и советом, что улучшить.\n"
    'Верни ответ СТРОГО в формате JSON: {{"score": int, "errors": [{{"sentence": str, '
    '"correction": str, "explanation": str}}], "feedback": str}}. '
    "Никакого дополнительного текста вне JSON."
)

TASK_REVIEW_SYSTEM_PROMPT = (
    "Ты вдумчивый преподаватель английского языка. Ученик только что проверил задание уровня {level} "
    "и допустил ошибки.\n"
    "Твоя задача:\n"
    "1. Проанализировать, в каких именно словах или грамматических правилах ученик ошибся.\n"
    "2. Коротко объяснить логику (например, различие значений слов или правило вопроса Who/Whose/Why/Where/When) "
    "и дать 1–2 практических совета, на что опереться при исправлении — без сухого перечисления и без прямого списка ответов.\n"
    "3. Пиши на русском языке, аккуратно разделяя мысли короткими абзацами (до 4–5 предложений)."
)


class LLMServiceError(Exception):
    """Base error raised by the LLM service layer."""


class LLMConnectionError(LLMServiceError):
    """Raised when Ollama is unreachable, times out, or returns a server/HTTP error."""


class LLMResponseParseError(LLMServiceError):
    """Raised when Ollama returns malformed JSON or violates the expected schema."""


def _strip_think_tags(raw_text: str) -> str:
    """Remove optional <think>...</think> reasoning blocks emitted by reasoning models."""
    return re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()


def _strip_markdown_fences(raw_text: str) -> str:
    """Remove optional ```json ... ``` markdown wrappers around LLM output."""
    cleaned = _strip_think_tags(raw_text)
    fence_match = re.match(
        r"^```(?:json)?\s*(.*?)\s*```$",
        cleaned,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if fence_match:
        return fence_match.group(1).strip()
    return cleaned


def _extract_json_object(raw_text: str) -> dict[str, Any]:
    """Parse a JSON object from raw LLM text, tolerating surrounding prose or fences."""
    cleaned = _strip_markdown_fences(raw_text)
    candidates = [cleaned]

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        candidates.append(cleaned[start : end + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed

    raise LLMResponseParseError("LLM response did not contain a valid JSON object.")


class LLMService:
    """Asynchronous client for interacting with a local Ollama instance."""

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout_seconds = timeout_seconds or settings.OLLAMA_TIMEOUT_SECONDS
        self._client = client

    def _build_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout_seconds),
        )

    async def chat_once(
        self,
        messages: list[dict[str, str]],
        response_format: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> str:
        """Send a non-streaming /api/chat request to Ollama and return assistant text."""
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "keep_alive": "10m",
        }
        if response_format is not None:
            payload["format"] = response_format
        if options is not None:
            payload["options"] = options

        owns_client = self._client is None
        client = self._build_client()
        try:
            response = await client.post("/api/chat", json=payload)
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise LLMConnectionError(
                f"Ollama request timed out after {self.timeout_seconds}s."
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise LLMConnectionError(
                f"Ollama returned HTTP {exc.response.status_code}."
            ) from exc
        except httpx.RequestError as exc:
            raise LLMConnectionError(
                f"Failed to connect to Ollama at {self.base_url}: {exc}"
            ) from exc
        finally:
            if owns_client:
                await client.aclose()

        try:
            body = response.json()
        except ValueError as exc:
            raise LLMResponseParseError(
                "Ollama returned non-JSON HTTP response body."
            ) from exc

        if not isinstance(body, dict):
            raise LLMResponseParseError("Unexpected Ollama response envelope.")

        message = body.get("message")
        if not isinstance(message, dict) or not isinstance(message.get("content"), str):
            raise LLMResponseParseError(
                "Ollama response missing 'message.content' string."
            )

        content = _strip_think_tags(message["content"])
        if not content:
            raise LLMResponseParseError("Ollama returned empty message content.")
        return content

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        options: dict[str, Any] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream assistant text chunks from Ollama /api/chat."""
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "keep_alive": "10m",
        }
        if options is not None:
            payload["options"] = options

        owns_client = self._client is None
        client = self._build_client()
        try:
            async with client.stream("POST", "/api/chat", json=payload) as response:
                if response.status_code >= 400:
                    await response.aread()
                    raise LLMConnectionError(
                        f"Ollama returned HTTP {response.status_code}."
                    )

                async for line in response.aiter_lines():
                    stripped = line.strip()
                    if not stripped:
                        continue
                    try:
                        chunk = json.loads(stripped)
                    except json.JSONDecodeError as exc:
                        raise LLMResponseParseError(
                            "Received invalid JSON chunk from Ollama stream."
                        ) from exc

                    if isinstance(chunk, dict) and chunk.get("error"):
                        raise LLMConnectionError(f"Ollama error: {chunk['error']}")

                    message = chunk.get("message") if isinstance(chunk, dict) else None
                    if isinstance(message, dict):
                        token = message.get("content")
                        if isinstance(token, str) and token:
                            yield token
        except httpx.TimeoutException as exc:
            raise LLMConnectionError(
                f"Ollama streaming timed out after {self.timeout_seconds}s."
            ) from exc
        except httpx.RequestError as exc:
            raise LLMConnectionError(
                f"Failed to stream from Ollama at {self.base_url}: {exc}"
            ) from exc
        finally:
            if owns_client:
                await client.aclose()

    async def evaluate_essay(
        self,
        essay_text: str,
        level: EnglishLevel,
        task_prompt: str | None = None,
    ) -> EssayEvaluationResponse:
        """Evaluate a learner essay and return validated JSON feedback."""
        system_prompt = ESSAY_EVALUATOR_PROMPT_TEMPLATE.format(level=level.value)
        user_content = essay_text.strip()
        if task_prompt:
            user_content = (
                f"Задание: {task_prompt.strip()}\n\nТекст ученика:\n{user_content}"
            )

        raw_reply = await self.chat_once(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format="json",
            options={"temperature": 0.2, "num_ctx": 4096, "num_predict": 900},
        )

        parsed = _extract_json_object(raw_reply)
        try:
            return EssayEvaluationResponse.model_validate(parsed)
        except Exception as exc:
            raise LLMResponseParseError(
                f"Essay evaluation JSON failed schema validation: {exc}"
            ) from exc

    @staticmethod
    def build_onboarding_messages(
        user_message: str,
        username: str,
        level: EnglishLevel,
        history: list[dict[str, str]] | None = None,
    ) -> list[dict[str, str]]:
        """Build concise onboarding system prompt and message history."""
        platform_context = (
            f"{ONBOARDING_SYSTEM_PROMPT}\n\n"
            "Правила ответа:\n"
            "- Отвечай очень кратко: максимум 2-4 коротких предложения или до 3 строк с переносами.\n"
            "- Пиши простым русским текстом без звёздочек ** и лишней разметки Markdown.\n\n"
            "Разделы платформы:\n"
            "1. Модули (главная страница) — карточки тем для уровня ученика.\n"
            "2. Внутри темы: вкладка «Теория и материалы» (видео и презентация) и вкладка «Практика» "
            "(тесты, карточки с картинками, конструктор предложений, загрузка эссе в .txt).\n"
            "3. Профиль — смена уровня (A2/B1/B2), средний балл и история всех попыток.\n"
            f"Ученик: {username}, уровень: {level.value}."
        )
        messages: list[dict[str, str]] = [
            {"role": "system", "content": platform_context}
        ]
        if history:
            messages.extend(history[-6:])
        messages.append({"role": "user", "content": user_message.strip()})
        return messages

    async def generate_onboarding_reply(
        self,
        user_message: str,
        username: str,
        level: EnglishLevel,
        history: list[dict[str, str]] | None = None,
    ) -> str:
        """Generate a short platform tour reply for first-time learners."""
        messages = self.build_onboarding_messages(
            user_message=user_message,
            username=username,
            level=level,
            history=history,
        )
        return await self.chat_once(
            messages=messages,
            options={"num_predict": 160, "temperature": 0.4},
        )

    async def stream_onboarding_reply(
        self,
        user_message: str,
        username: str,
        level: EnglishLevel,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a concise onboarding reply token-by-token."""
        messages = self.build_onboarding_messages(
            user_message=user_message,
            username=username,
            level=level,
            history=history,
        )
        async for chunk in self.stream_chat(
            messages=messages,
            options={"num_predict": 160, "temperature": 0.4},
        ):
            yield chunk

    @staticmethod
    def build_socratic_messages(
        task_context: str,
        history: list[dict[str, str]],
        student_message: str,
    ) -> list[dict[str, str]]:
        """Assemble system prompt, saved dialogue history, and new student turn."""
        system_prompt = SOCRATIC_TUTOR_PROMPT_TEMPLATE.format(
            task_context=task_context.strip()
        )
        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]
        for entry in history:
            role = entry.get("role")
            content = entry.get("content")
            if role in ("user", "assistant") and isinstance(content, str) and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": student_message.strip()})
        return messages

    async def analyze_task_mistakes(
        self,
        task_title: str,
        level: EnglishLevel,
        mistake_details: list[str],
        correct_count: int,
        total_count: int,
    ) -> str:
        """Produce thoughtful pedagogical analysis of a learner's mistakes on a task."""
        system_prompt = TASK_REVIEW_SYSTEM_PROMPT.format(level=level.value)
        summary_lines = "\n".join(f"- {item}" for item in mistake_details[:8])
        user_prompt = (
            f"Задание: {task_title}\n"
            f"Результат: {correct_count} из {total_count}.\n"
            f"Ошибочные ответы ученика:\n{summary_lines}\n\n"
            "Проанализируй причины ошибок и объясни, на какие правила или значения слов "
            "обратить внимание, чтобы ученик понял логику и смог исправить ответы сам."
        )
        return await self.chat_once(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            options={"temperature": 0.3, "num_ctx": 2048, "num_predict": 220},
        )

    async def stream_socratic_reply(
        self,
        task_context: str,
        history: list[dict[str, str]],
        student_message: str,
    ) -> AsyncGenerator[str, None]:
        """Stream a Socratic tutor response turn without revealing direct answers."""
        messages = self.build_socratic_messages(
            task_context=task_context,
            history=history,
            student_message=student_message,
        )
        async for chunk in self.stream_chat(
            messages=messages,
            options={"temperature": 0.35, "num_ctx": 2048, "num_predict": 200},
        ):
            yield chunk


def get_llm_service() -> LLMService:
    """FastAPI dependency returning an LLMService configured from settings."""
    return LLMService()
