import { motion } from "framer-motion";
import { Brain, Loader2 } from "lucide-react";
import FormattedText from "./FormattedText";

export default function TaskAIReviewBox({
  canRequest = false,
  onRequestReview,
  isLoading,
  review,
}) {
  if (!isLoading && !review) {
    if (!canRequest || !onRequestReview) return null;
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={onRequestReview}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          <Brain className="h-4 w-4 text-indigo-600" />
          Получить AI-разбор ошибок на карточке
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-slate-800"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        ) : (
          <Brain className="h-4 w-4 text-indigo-600" />
        )}
        <span>
          {isLoading
            ? "ИИ анализирует ваши ошибки..."
            : "Умный AI-разбор ошибок"}
        </span>
      </div>

      {!isLoading && review?.analysis && (
        <div className="rounded-xl border border-indigo-100 bg-white p-3.5 text-slate-700 shadow-sm">
          <FormattedText text={review.analysis} />
        </div>
      )}
    </motion.div>
  );
}
