import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  MessageSquareHeart,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { api } from "../services/api";
import CharacterIllustration from "./CharacterIllustrations";
import TaskAIReviewBox from "./TaskAIReviewBox";

function DraggableWordChip({ word, isSelected, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `word:${word}`,
      data: { word },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab select-none rounded-xl border px-3.5 py-2 text-sm font-bold shadow-sm transition active:cursor-grabbing ${
        isDragging
          ? "opacity-40"
          : isSelected
            ? "border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-200"
            : "border-indigo-200 bg-white text-indigo-800 hover:border-indigo-400 hover:bg-indigo-50"
      }`}
    >
      {word}
    </button>
  );
}

function DroppableCharacterCard({
  card,
  assignedWord,
  itemResult,
  isWordArmed,
  onCardClick,
  onClearWord,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: card.id,
  });

  const borderStyle = itemResult
    ? itemResult.is_correct
      ? "border-emerald-400 bg-emerald-50/60"
      : "border-rose-300 bg-rose-50/50"
    : isOver
      ? "border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-200"
      : isWordArmed
        ? "border-indigo-300 bg-white hover:border-indigo-500"
        : "border-slate-200 bg-white";

  return (
    <div
      ref={setNodeRef}
      onClick={onCardClick}
      className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
        isWordArmed ? "cursor-pointer" : ""
      } ${borderStyle}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 overflow-hidden rounded-xl border border-slate-100">
          <CharacterIllustration imageKey={card.image_key} />
        </div>
        <p className="text-xs leading-relaxed text-slate-700">
          {card.description}
        </p>
      </div>

      <div className="mt-3 flex min-h-[42px] items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
        {assignedWord ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900">
              {assignedWord}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearWord(card.id);
              }}
              title="Убрать слово"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {isWordArmed
              ? "Нажмите сюда, чтобы прикрепить слово"
              : "Перетащите слово сюда"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MatchingGame({ task, onNeedTutor, onCompleted }) {
  const content = task.content || {};
  const cards = content.cards || [];
  const allWords = content.words || [];

  const [matches, setMatches] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [activeDragWord, setActiveDragWord] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMatches({});
    setSelectedWord(null);
    setResult(null);
    setAiReview(null);
    setIsReviewing(false);
    setError("");
    setShowHint(false);
  }, [task.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const usedWords = new Set(Object.values(matches));
  const availableWords = allWords.filter((w) => !usedWords.has(w));
  const resultMap = new Map(
    (result?.item_results || []).map((item) => [item.id, item])
  );

  function assignWordToCard(word, cardId) {
    setMatches((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v === word) delete next[k];
      }
      next[cardId] = word;
      return next;
    });
    setSelectedWord(null);
    setResult(null);
    setAiReview(null);
  }

  function handleDragStart(event) {
    setActiveDragWord(event.active.data.current?.word || null);
  }

  function handleDragEnd(event) {
    setActiveDragWord(null);
    const { active, over } = event;
    if (!over) return;
    const word = active.data.current?.word;
    if (word && over.id) {
      assignWordToCard(word, String(over.id));
    }
  }

  function handleClearWord(cardId) {
    setMatches((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    setResult(null);
    setAiReview(null);
  }

  function handleReset() {
    setMatches({});
    setSelectedWord(null);
    setResult(null);
    setAiReview(null);
    setIsReviewing(false);
    setError("");
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    setAiReview(null);
    try {
      const response = await api.submitTask(task.id, { matches });
      setResult(response);
      onCompleted?.(response);
      if (response.should_open_tutor) {
        onNeedTutor?.(
          task,
          response.wrong_summary ||
            `Верно ${response.correct_count} из ${response.total_count}`
        );
      }
    } catch (err) {
      setError(err.message || "Не удалось проверить сопоставления.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestReview() {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      const review = await api.reviewTaskMistakes(task.id, { matches });
      setAiReview(review);
    } catch {
      // Ignore transient review error
    } finally {
      setIsReviewing(false);
    }
  }

  const filledCount = Object.keys(matches).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          Картинки и слова ({filledCount} / {cards.length})
        </span>
        {result && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              result.is_correct
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            Балл: {result.score} / 10 ({result.correct_count}/{result.total_count})
          </span>
        )}
      </div>

      {content.title && (
        <h3 className="mt-3 text-base font-bold text-slate-900">
          {content.title}
        </h3>
      )}
      <p className="mt-1.5 text-sm text-slate-600">{content.instruction}</p>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
            Банк слов ({availableWords.length} осталось)
          </p>
          {availableWords.length === 0 ? (
            <p className="text-xs font-medium text-emerald-700">
              Все слова распределены по карточкам — можно проверять!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableWords.map((word) => (
                <DraggableWordChip
                  key={word}
                  word={word}
                  isSelected={selectedWord === word}
                  onClick={() =>
                    setSelectedWord((prev) => (prev === word ? null : word))
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <DroppableCharacterCard
              key={card.id}
              card={card}
              assignedWord={matches[card.id]}
              itemResult={resultMap.get(card.id)}
              isWordArmed={Boolean(selectedWord)}
              onCardClick={() => {
                if (selectedWord) {
                  assignWordToCard(selectedWord, card.id);
                }
              }}
              onClearWord={handleClearWord}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragWord ? (
            <div className="rounded-xl border border-indigo-600 bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white shadow-xl">
              {activeDragWord}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {content.hint && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {showHint ? "Скрыть подсказку" : "Показать подсказку"}
          </button>
          {showHint && (
            <p className="mt-1.5 rounded-xl bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
              {content.hint}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || filledCount === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "Проверяем..." : "Проверить совпадения"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" />
          Сбросить
        </button>

        {result && !result.is_correct && (
          <button
            type="button"
            onClick={() =>
              onNeedTutor?.(
                task,
                result.wrong_summary ||
                  `Верно ${result.correct_count} из ${result.total_count}`
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <MessageSquareHeart className="h-4 w-4" />
            Разобрать ошибки с ИИ-репетитором
          </button>
        )}
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-xl border p-4 text-sm ${
            result.is_correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {result.is_correct ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}
            <p className="font-semibold">{result.feedback}</p>
          </div>
        </motion.div>
      )}

      <TaskAIReviewBox
        canRequest={Boolean(result && !result.is_correct)}
        onRequestReview={handleRequestReview}
        isLoading={isReviewing}
        review={aiReview}
      />
    </div>
  );
}
