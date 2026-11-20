# LinguaAI — ИИ-платформа для изучения английского языка

Веб-платформа для адаптивного изучения английского языка (CEFR уровни `A2`, `B1`, `B2`) с геймификацией, сократовским ИИ-репетитором по WebSocket и автоматической проверкой эссе через локальную Ollama.

## Стек технологий
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), Alembic, PostgreSQL 16.
- **AI (Ollama):** асинхронный клиент `httpx` (`/api/chat`, streaming & JSON mode), модель по умолчанию `qwen2.5:7b` (хорошо работает с русскими промптами и грамматическим разбором английского текста; альтернативы: `llama3.1:8b` или более лёгкая `qwen2.5:3b`).
- **Frontend:** React 18, Vite, React Router, Zustand, TailwindCSS, Framer Motion, React Dropzone, `@dnd-kit`.
- **Infrastructure:** Docker, Docker Compose, Nginx reverse-proxy для `/api/` и `/ws/`.

## Быстрый старт (Docker Compose)

1. Убедитесь, что локальная Ollama запущена на хосте и модель загружена:
   ```bash
   ollama pull qwen2.5:7b
   ```
2. При необходимости скопируйте `.env.example` в `.env` и скорректируйте параметры (`OLLAMA_MODEL`, `OLLAMA_BASE_URL`, секреты).
3. Запустите Docker Desktop и поднимите все сервисы:
   ```bash
   docker-compose up --build
   ```
4. После старта (миграции Alembic и seed-данные применяются автоматически):
   - **Frontend:** `http://localhost:5173`
   - **Backend Swagger UI:** `http://localhost:8000/docs`
   - **Демо-ученик:** кнопка «Быстрый старт: войти как Demo-ученик» на `/login` (или `demo_student` / `demo12345`).

## Архитектура встраиваемого модуля изучения

В компоненте `frontend/src/components/MaterialSelector.jsx` подключён слот `frontend/src/components/StudyModuleSlot.jsx`, куда можно встроить подробный интерактивный учебный модуль без изменения роутинга или API.

## Тестирование (Pytest)

```bash
cd backend
pytest -v
```
Набор тестов в `backend/tests/` покрывает:
- `test_llm_service.py` — мок-тесты `LLMService` на корректный JSON, markdown-обёртки, таймауты, `ConnectError`, HTTP 500, повреждённый JSON/стрим;
- `test_api_core.py` — регистрация, вход, demo-логин, онбординг, CRUD тем/заданий, санитизация ответов, проверка тестов и drag-and-drop;
- `test_homework_and_ws.py` — загрузка `.txt` эссе, обработка ошибок LLM, fallback онбординга, WebSocket-стриминг и сохранение/сброс истории в `chat_sessions`.
