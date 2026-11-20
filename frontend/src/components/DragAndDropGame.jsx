import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Lightbulb,
  MessageSquareHeart,
  RotateCcw,
  Send,
} from "lucide-react";
import { api } from "../services/api";
import MatchingGame from "./MatchingGame";
import TaskAIReviewBox from "./TaskAIReviewBox";

function SortableWordChip({ id, text }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`inline-flex cursor-grab select-none items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold shadow-sm transition active:cursor-grabbing ${
        isDragging
          ? "z-20 border-indigo-500 bg-indigo-600 text-white shadow-lg"
          : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40"
      }`}
    >
      <GripVertical
        className={`h-3.5 w-3.5 ${
          isDragging ? "text-indigo-100" : "text-slate-400"
        }`}
      />
      <span>{text}</span>
    </div>
  );
}

function buildInitialTokens(words) {
  return (words || []).map((word, index) => ({
    id: `token-${index}`,
    text: word,
  }));
}

function SentenceBuilderGame({ task, onNeedTutor, onCompleted }) {
  const content = task.content || {};
  const [items, setItems] = useState(() => buildInitialTokens(content.words));
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(buildInitialTokens(task.content?.words));
    setResult(null);
    setAiReview(null);
    setIsReviewing(false);
    setError("");
    setShowHint(false);
  }, [task.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setResult(null);
    setAiReview(null);
  }

  function handleResetOrder() {
    setItems(buildInitialTokens(content.words));
    setResult(null);
    setAiReview(null);
    setIsReviewing(false);
    setError("");
  }

  async function handleSubmit() {
    if (isSubmitting || items.length === 0) return;

    setIsSubmitting(true);
    setError("");
    setAiReview(null);
    const submittedWords = items.map((item) => item.text);
    try {
      const response = await api.submitTask(task.id, { words: submittedWords });
      setResult(response);
      onCompleted?.(response);
      if (response.should_open_tutor) {
        onNeedTutor?.(
          task,
          response.wrong_summary || submittedWords.join(" ")
        );
      }
    } catch (err) {
      setError(err.message || "Не удалось проверить предложение.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestReview() {
    if (isReviewing) return;
    setIsReviewing(true);
    const submittedWords = items.map((item) => item.text);
    try {
      const review = await api.reviewTaskMistakes(task.id, {
        words: submittedWords,
      });
      setAiReview(review);
    } catch {
      // Ignore transient review error
    } finally {
      setIsReviewing(false);
    }
  }

  const currentSentence = items.map((item) => item.text).join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          Конструктор предложений
        </span>
        {result && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              result.is_correct
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            Балл: {result.score} / 10
          </span>
        )}
      </div>

      {content.title && (
        <h3 className="mt-3 text-base font-bold text-slate-900">
          {content.title}
        </h3>
      )}
      <p className="mt-1.5 text-sm text-slate-600">
        {content.instruction || "Перетащите слова, чтобы составить правильное предложение."}
      </p>

      <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-slate-50 p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-2.5">
              {items.map((item) => (
                <SortableWordChip
                  key={item.id}
                  id={item.id}
                  text={item.text}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-4 border-t border-slate-200/80 pt-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            Текущее предложение:{" "}
          </span>
          <span className="text-sm font-medium text-slate-900">
            {currentSentence}
          </span>
        </div>
      </div>

      {content.hint && (
        <div className="mt-3">
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "Проверяем..." : "Проверить предложение"}
        </button>

        <button
          type="button"
          onClick={handleResetOrder}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" />
          Сбросить
        </button>

        {result && !result.is_correct && (
          <button
            type="button"
            onClick={() => onNeedTutor?.(task, currentSentence)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <MessageSquareHeart className="h-4 w-4" />
            Спросить ИИ-репетитора
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

export default function DragAndDropGame({ task, onNeedTutor, onCompleted }) {
  if (task.content?.mode === "matching") {
    return (
      <MatchingGame
        task={task}
        onNeedTutor={onNeedTutor}
        onCompleted={onCompleted}
      />
    );
  }
  return (
    <SentenceBuilderGame
      task={task}
      onNeedTutor={onNeedTutor}
      onCompleted={onCompleted}
    />
  );
}
