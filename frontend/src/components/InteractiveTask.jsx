import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquareHeart,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { api } from "../services/api";
import TaskAIReviewBox from "./TaskAIReviewBox";

function UnderlineQuestionRow({ item, selectedValue, itemResult, onSelect }) {
  const match = item.question.match(/^(.*?)\(([^)]+)\)(.*)$/);

  if (!match) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-800">{item.question}</p>
        <div className="flex flex-wrap gap-2">
          {item.options.map((opt) => {
            const active = selectedValue === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSelect(item.id, opt)}
                className={`rounded-lg border px-3 py-1 text-sm font-semibold transition ${
                  active
                    ? "border-indigo-600 bg-indigo-50 text-indigo-800 underline decoration-2 underline-offset-4"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const [, prefix, , suffix] = match;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm leading-loose text-slate-800 sm:text-base">
        <span>{prefix}</span>
        <span className="mx-1 inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-0.5">
          <span>(</span>
          {item.options.map((opt, idx) => {
            const isSelected = selectedValue === opt;
            return (
              <span key={opt} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => onSelect(item.id, opt)}
                  className={`rounded-md px-1.5 py-0.5 font-semibold transition ${
                    isSelected
                      ? "bg-indigo-600 text-white underline decoration-2 underline-offset-4"
                      : "text-indigo-700 hover:bg-indigo-100 hover:underline"
                  }`}
                >
                  {opt}
                </button>
                {idx < item.options.length - 1 && (
                  <span className="mx-1 text-slate-400">/</span>
                )}
              </span>
            );
          })}
          <span>)</span>
        </span>
        <span>{suffix}</span>
      </p>

      {itemResult && (
        <span className="shrink-0">
          {itemResult.is_correct ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-600" />
          )}
        </span>
      )}
    </div>
  );
}

function MultiQuestionTest({ task, onNeedTutor, onCompleted }) {
  const content = task.content || {};
  const questions = content.questions || [];
  const isUnderline = content.display_mode === "underline";

  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnswers({});
    setResult(null);
    setAiReview(null);
    setIsReviewing(false);
    setError("");
  }, [task.id]);

  const resultMap = new Map(
    (result?.item_results || []).map((item) => [item.id, item])
  );

  function handleSelect(questionId, option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    setResult(null);
    setAiReview(null);
  }

  function handleReset() {
    setAnswers({});
    setResult(null);
    setAiReview(null);
    setIsReviewing(false);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting || Object.keys(answers).length === 0) return;

    setIsSubmitting(true);
    setError("");
    setAiReview(null);
    try {
      const response = await api.submitTask(task.id, { answers });
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
      setError(err.message || "Не удалось проверить тест.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestReview() {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      const review = await api.reviewTaskMistakes(task.id, { answers });
      setAiReview(review);
    } catch {
      // Ignore transient review error
    } finally {
      setIsReviewing(false);
    }
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {isUnderline ? "Грамматика (подчёркивание)" : "Тест-практикум"} (
          {answeredCount} / {questions.length})
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
      {content.instruction && (
        <p className="mt-1 text-sm text-slate-600">{content.instruction}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {questions.map((item) => {
          const itemResult = resultMap.get(item.id);
          const cardStateClass = itemResult
            ? itemResult.is_correct
              ? "border-emerald-300 bg-emerald-50/40"
              : "border-rose-300 bg-rose-50/40"
            : "border-slate-200 bg-white";

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition ${cardStateClass}`}
            >
              {isUnderline ? (
                <UnderlineQuestionRow
                  item={item}
                  selectedValue={answers[item.id]}
                  itemResult={itemResult}
                  onSelect={handleSelect}
                />
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 sm:text-base">
                      {item.question}
                    </p>
                    {itemResult && (
                      <span className="shrink-0">
                        {itemResult.is_correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-600" />
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {item.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = answers[item.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelect(item.id, opt)}
                          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {letter}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {itemResult?.explanation && (
                <p className="mt-2.5 text-xs text-emerald-700">
                  {itemResult.explanation}
                </p>
              )}
            </div>
          );
        })}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={answeredCount === 0 || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Проверяем..." : "Проверить ответы"}
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
              Разобрать с ИИ-репетитором
            </button>
          )}
        </div>
      </form>

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

function SingleQuestionTest({ task, onNeedTutor, onCompleted }) {
  const [selected, setSelected] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelected("");
    setResult(null);
    setAiReview(null);
    setIsReviewing(false);
    setError("");
  }, [task.id]);

  const content = task.content || {};
  const options = content.options || [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    setAiReview(null);
    try {
      const response = await api.submitTask(task.id, { answer: selected });
      setResult(response);
      onCompleted?.(response);
      if (response.should_open_tutor) {
        onNeedTutor?.(task, response.wrong_summary || selected);
      }
    } catch (err) {
      setError(err.message || "Не удалось проверить ответ.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestSingleReview() {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      const review = await api.reviewTaskMistakes(task.id, { answer: selected });
      setAiReview(review);
    } catch {
      // Ignore transient review error
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Тест
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
      <p className="mt-2 text-base font-medium text-slate-800">
        {content.question}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <motion.label
              key={option}
              whileTap={{ scale: 0.995 }}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50/80 font-medium text-indigo-900 ring-2 ring-indigo-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name={`task-${task.id}`}
                value={option}
                checked={isSelected}
                onChange={() => {
                  setSelected(option);
                  setResult(null);
                  setAiReview(null);
                }}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span>{option}</span>
            </motion.label>
          );
        })}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!selected || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Проверяем..." : "Проверить ответ"}
          </button>

          {result && !result.is_correct && (
            <button
              type="button"
              onClick={() => onNeedTutor?.(task, selected)}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <MessageSquareHeart className="h-4 w-4" />
              Разобрать с ИИ-репетитором
            </button>
          )}
        </div>
      </form>

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
            <div>
              <p className="font-semibold">{result.feedback}</p>
              {result.explanation && (
                <p className="mt-1 text-emerald-800">{result.explanation}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <TaskAIReviewBox
        canRequest={Boolean(result && !result.is_correct)}
        onRequestReview={handleRequestSingleReview}
        isLoading={isReviewing}
        review={aiReview}
      />
    </div>
  );
}

export default function InteractiveTask({ task, onNeedTutor, onCompleted }) {
  if (Array.isArray(task.content?.questions) && task.content.questions.length > 0) {
    return (
      <MultiQuestionTest
        task={task}
        onNeedTutor={onNeedTutor}
        onCompleted={onCompleted}
      />
    );
  }
  return (
    <SingleQuestionTest
      task={task}
      onNeedTutor={onNeedTutor}
      onCompleted={onCompleted}
    />
  );
}
