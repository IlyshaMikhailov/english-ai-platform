"""Task CRUD, backend answer validation, and AI mistake analysis endpoints."""

from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import TaskType
from app.models.progress import Progress
from app.models.task import Task
from app.models.user import User
from app.schemas.ai import TaskAIReviewResponse
from app.schemas.task import (
    TaskRead,
    TaskSubmitItemResult,
    TaskSubmitRequest,
    TaskSubmitResponse,
    TaskUpdate,
    validate_task_content,
)
from app.services.llm_service import LLMService, LLMServiceError, get_llm_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def _get_task_or_404(db: AsyncSession, task_id: uuid.UUID) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return task


def _normalize_whitespace(value: str) -> str:
    return " ".join(value.split())


def _evaluate_multi_question_test(
    questions: list[dict[str, Any]],
    submitted_map: dict[str, str],
) -> dict[str, Any]:
    item_results: list[TaskSubmitItemResult] = []
    learner_wrong_labels: list[str] = []
    ai_mistake_details: list[str] = []
    correct_count = 0

    for item in questions:
        qid = str(item["id"])
        submitted = _normalize_whitespace(str(submitted_map.get(qid, "")))
        expected = _normalize_whitespace(str(item.get("correct_answer", "")))
        is_item_correct = bool(submitted) and submitted.lower() == expected.lower()
        if is_item_correct:
            correct_count += 1
        else:
            choice_label = submitted or "ответ не выбран"
            learner_wrong_labels.append(f"{item['question']} (выбрано: «{choice_label}»)")
            ai_mistake_details.append(
                f"Вопрос «{item['question']}» — ученик выбрал «{choice_label}», "
                f"правильный ответ для ориентира модели: «{expected}»"
            )
        item_results.append(
            TaskSubmitItemResult(
                id=qid,
                is_correct=is_item_correct,
                submitted=submitted,
                explanation=item.get("explanation") if is_item_correct else None,
            )
        )

    total_count = len(questions)
    all_correct = correct_count == total_count
    score = round((correct_count / total_count) * 10.0, 2) if total_count else 0.0
    return {
        "is_correct": all_correct,
        "score": score,
        "correct_count": correct_count,
        "total_count": total_count,
        "item_results": item_results,
        "explanation": None,
        "wrong_labels": learner_wrong_labels,
        "ai_mistake_details": ai_mistake_details,
        "feedback_payload": {
            "submitted_answers": submitted_map,
            "correct_count": correct_count,
            "total_count": total_count,
            "is_correct": all_correct,
        },
    }


def _evaluate_matching_task(
    pairs: list[dict[str, Any]],
    submitted_map: dict[str, str],
) -> dict[str, Any]:
    item_results: list[TaskSubmitItemResult] = []
    learner_wrong_labels: list[str] = []
    ai_mistake_details: list[str] = []
    correct_count = 0

    for pair in pairs:
        pid = str(pair["id"])
        submitted = _normalize_whitespace(str(submitted_map.get(pid, "")))
        expected = _normalize_whitespace(str(pair.get("word", "")))
        is_item_correct = bool(submitted) and submitted.lower() == expected.lower()
        if is_item_correct:
            correct_count += 1
        else:
            choice_label = submitted or "слово не выбрано"
            learner_wrong_labels.append(
                f"Карточка «{pair['description']}» (выбрано: «{choice_label}»)"
            )
            ai_mistake_details.append(
                f"Карточка «{pair['description']}» — ученик выбрал «{choice_label}», "
                f"правильное слово для ориентира модели: «{expected}»"
            )
        item_results.append(
            TaskSubmitItemResult(
                id=pid,
                is_correct=is_item_correct,
                submitted=submitted,
                explanation=pair.get("description") if is_item_correct else None,
            )
        )

    total_count = len(pairs)
    all_correct = correct_count == total_count
    score = round((correct_count / total_count) * 10.0, 2) if total_count else 0.0
    return {
        "is_correct": all_correct,
        "score": score,
        "correct_count": correct_count,
        "total_count": total_count,
        "item_results": item_results,
        "explanation": None,
        "wrong_labels": learner_wrong_labels,
        "ai_mistake_details": ai_mistake_details,
        "feedback_payload": {
            "submitted_matches": submitted_map,
            "correct_count": correct_count,
            "total_count": total_count,
            "is_correct": all_correct,
        },
    }


def _evaluate_submission(task: Task, payload: TaskSubmitRequest) -> dict[str, Any]:
    """Validate learner answer for test, sentence-builder, and matching tasks."""
    content = task.content or {}

    if task.type == TaskType.test:
        questions = content.get("questions")
        if isinstance(questions, list) and questions:
            submitted_map = payload.answers or {}
            return _evaluate_multi_question_test(questions, submitted_map)

        if payload.words:
            submitted = _normalize_whitespace(" ".join(payload.words))
        else:
            submitted = _normalize_whitespace(payload.answer or "")
        expected = _normalize_whitespace(str(content.get("correct_answer", "")))
        is_correct = submitted == expected
        wrong_labels = (
            []
            if is_correct
            else [f"Вопрос «{content.get('question', '')}» (выбрано: «{submitted}»)"]
        )
        ai_details = (
            []
            if is_correct
            else [
                f"Вопрос «{content.get('question', '')}» — ученик выбрал «{submitted}», "
                f"правильный ответ для ориентира модели: «{expected}»"
            ]
        )
        return {
            "is_correct": is_correct,
            "score": 10.0 if is_correct else 0.0,
            "correct_count": 1 if is_correct else 0,
            "total_count": 1,
            "item_results": [],
            "explanation": content.get("explanation") if is_correct else None,
            "wrong_labels": wrong_labels,
            "ai_mistake_details": ai_details,
            "feedback_payload": {
                "submitted_answer": submitted,
                "is_correct": is_correct,
            },
        }

    if task.type == TaskType.gamified:
        if content.get("mode") == "matching":
            pairs = content.get("pairs") or []
            submitted_map = payload.matches or payload.answers or {}
            return _evaluate_matching_task(pairs, submitted_map)

        if payload.words:
            submitted = _normalize_whitespace(" ".join(payload.words))
        else:
            submitted = _normalize_whitespace(payload.answer or "")
        expected = _normalize_whitespace(str(content.get("correct_sentence", "")))
        is_correct = submitted == expected or (
            submitted.rstrip(".!?") == expected.rstrip(".!?")
            and bool(submitted.rstrip(".!?"))
        )
        wrong_labels = (
            []
            if is_correct
            else [f"Собранное предложение: «{submitted}»"]
        )
        ai_details = (
            []
            if is_correct
            else [
                f"Конструктор предложений — ученик собрал «{submitted}», "
                f"целевое предложение для ориентира модели: «{expected}»"
            ]
        )
        return {
            "is_correct": is_correct,
            "score": 10.0 if is_correct else 0.0,
            "correct_count": 1 if is_correct else 0,
            "total_count": 1,
            "item_results": [],
            "explanation": None,
            "wrong_labels": wrong_labels,
            "ai_mistake_details": ai_details,
            "feedback_payload": {
                "submitted_answer": submitted,
                "is_correct": is_correct,
            },
        }

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Essay tasks must be evaluated via /api/v1/homework/evaluate.",
    )


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TaskRead:
    """Return full task details (CRUD read)."""
    task = await _get_task_or_404(db, task_id)
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TaskRead:
    """Update a task's type and/or validated content."""
    task = await _get_task_or_404(db, task_id)
    next_type = payload.type or task.type
    next_content = payload.content if payload.content is not None else task.content

    try:
        validated_content = validate_task_content(next_type, next_content)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    task.type = next_type
    task.content = validated_content
    await db.commit()
    await db.refresh(task)
    return TaskRead.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    """Delete a task by ID."""
    task = await _get_task_or_404(db, task_id)
    await db.delete(task)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{task_id}/submit", response_model=TaskSubmitResponse)
async def submit_task_answer(
    task_id: uuid.UUID,
    payload: TaskSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskSubmitResponse:
    """Validate test or gamified task answer and record learner progress."""
    task = await _get_task_or_404(db, task_id)
    evaluation = _evaluate_submission(task, payload)
    is_correct = evaluation["is_correct"]
    score = evaluation["score"]
    correct_count = evaluation["correct_count"]
    total_count = evaluation["total_count"]
    wrong_labels = evaluation["wrong_labels"]

    progress = Progress(
        user_id=current_user.id,
        topic_id=task.topic_id,
        task_id=task.id,
        score=score,
        ai_feedback=evaluation["feedback_payload"],
    )
    db.add(progress)
    await db.commit()
    await db.refresh(progress)

    if is_correct:
        feedback_text = (
            f"Отлично! Все {total_count} из {total_count} верны."
            if total_count and total_count > 1
            else "Отлично! Ответ абсолютно верный."
        )
        return TaskSubmitResponse(
            task_id=task.id,
            task_type=task.type,
            is_correct=True,
            score=score,
            feedback=feedback_text,
            explanation=evaluation["explanation"],
            should_open_tutor=False,
            wrong_summary=None,
            progress_id=progress.id,
            correct_count=correct_count,
            total_count=total_count,
            item_results=evaluation["item_results"],
        )

    wrong_summary = "; ".join(wrong_labels[:3]) if wrong_labels else None
    feedback_text = (
        f"Верно {correct_count} из {total_count}. ИИ анализирует ошибки и готов помочь разобраться!"
        if total_count and total_count > 1
        else "Пока есть ошибка. Давайте разберём её с ИИ-репетитором!"
    )
    return TaskSubmitResponse(
        task_id=task.id,
        task_type=task.type,
        is_correct=False,
        score=score,
        feedback=feedback_text,
        explanation=None,
        should_open_tutor=True,
        wrong_summary=wrong_summary,
        progress_id=progress.id,
        correct_count=correct_count,
        total_count=total_count,
        item_results=evaluation["item_results"],
    )


@router.post("/{task_id}/ai-review", response_model=TaskAIReviewResponse)
async def ai_review_task_mistakes(
    task_id: uuid.UUID,
    payload: TaskSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(get_llm_service),
) -> TaskAIReviewResponse:
    """Analyze learner mistakes on a task with thoughtful LLM pedagogical feedback."""
    task = await _get_task_or_404(db, task_id)
    evaluation = _evaluate_submission(task, payload)
    if evaluation["is_correct"]:
        return TaskAIReviewResponse(
            analysis="Все ответы верны! Отличная работа — ошибок для разбора нет.",
            wrong_items=[],
            is_fallback=False,
        )

    title = str((task.content or {}).get("title") or "Практическое задание")
    wrong_labels = evaluation["wrong_labels"]
    ai_details = evaluation["ai_mistake_details"]

    try:
        analysis = await llm_service.analyze_task_mistakes(
            task_title=title,
            level=current_user.level,
            mistake_details=ai_details,
            correct_count=evaluation["correct_count"],
            total_count=evaluation["total_count"],
        )
        return TaskAIReviewResponse(
            analysis=analysis,
            wrong_items=wrong_labels[:5],
            is_fallback=False,
        )
    except LLMServiceError:
        fallback_items = "\n".join(f"• {item}" for item in wrong_labels[:5])
        return TaskAIReviewResponse(
            analysis=(
                "Локальная LLM сейчас недоступна, но вот пункты, в которых есть ошибки:\n"
                f"{fallback_items}\n\n"
                "Откройте ИИ-репетитора после запуска Ollama, чтобы разобрать их по шагам."
            ),
            wrong_items=wrong_labels[:5],
            is_fallback=True,
        )
