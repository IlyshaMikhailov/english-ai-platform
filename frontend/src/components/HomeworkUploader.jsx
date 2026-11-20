import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  Loader2,
  PenLine,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { api } from "../services/api";
import FormattedText from "./FormattedText";

export default function HomeworkUploader({ task, onEvaluated }) {
  const [inputMode, setInputMode] = useState("file");
  const [selectedFile, setSelectedFile] = useState(null);
  const [essayText, setEssayText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");

  const content = task?.content || {};

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError("");
    setFeedback(null);
    if (rejectedFiles.length > 0) {
      setError("Пожалуйста, загрузите текстовый файл формата .txt.");
      return;
    }
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"] },
    maxFiles: 1,
    multiple: false,
  });

  async function handleEvaluate() {
    if (isEvaluating) return;
    let fileToSend = selectedFile;
    if (inputMode === "text") {
      if (!essayText.trim()) return;
      fileToSend = new File([essayText.trim()], "essay.txt", {
        type: "text/plain",
      });
    }
    if (!fileToSend) return;

    setIsEvaluating(true);
    setError("");
    try {
      const response = await api.evaluateHomework(fileToSend, task?.id || null);
      setFeedback(response);
      onEvaluated?.(response);
    } catch (err) {
      setError(
        err.message ||
          "Не удалось проверить эссе. Убедитесь, что локальная Ollama запущена."
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Творческое задание (Эссе)
        </span>
        {content.min_words && content.max_words && (
          <span className="text-xs font-medium text-slate-500">
            Рекомендуемый объём: {content.min_words}–{content.max_words} слов
          </span>
        )}
      </div>

      {content.title && (
        <h3 className="mt-3 text-base font-bold text-slate-900">
          {content.title}
        </h3>
      )}
      {content.prompt && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
          {content.prompt}
        </p>
      )}

      {Array.isArray(content.rubric) && content.rubric.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {content.rubric.map((criterion, idx) => (
            <li
              key={idx}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
            >
              {criterion}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setInputMode("file");
            setError("");
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
            inputMode === "file"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          Загрузить .txt файл
        </button>
        <button
          type="button"
          onClick={() => {
            setInputMode("text");
            setError("");
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
            inputMode === "text"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" />
          Написать текст здесь
        </button>
      </div>

      {inputMode === "file" ? (
        <>
          <div
            {...getRootProps()}
            className={`mt-3 cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition ${
              isDragActive
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/40"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-10 w-10 text-indigo-500" />
            <p className="mt-2.5 text-sm font-semibold text-slate-800">
              {isDragActive
                ? "Отпустите файл для загрузки..."
                : "Перетащите .txt файл с эссе сюда или нажмите для выбора"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Поддерживаются текстовые файлы UTF-8 (.txt) до 200 КБ
            </p>
          </div>

          {selectedFile && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} КБ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ИИ проверяет эссе...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Отправить на проверку ИИ
                  </>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <textarea
            rows={6}
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder="Напишите эссе на английском языке..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              Слов: {essayText.trim() ? essayText.trim().split(/\s+/).length : 0}
            </span>
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={isEvaluating || !essayText.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ИИ проверяет эссе...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Проверить эссе через ИИ
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isEvaluating && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>
            Локальная LLM анализирует грамматику, лексику и логику текста...
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-base font-bold text-slate-900">
              Результат AI-проверки
            </h4>
            <div
              className={`rounded-xl px-4 py-1.5 text-sm font-bold ${
                feedback.score >= 8
                  ? "bg-emerald-100 text-emerald-800"
                  : feedback.score >= 5
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
              }`}
            >
              Оценка: {feedback.score} / 10
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <FormattedText text={feedback.feedback} />
          </div>

          {feedback.errors && feedback.errors.length > 0 ? (
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Найденные ошибки ({feedback.errors.length})
              </h5>
              {feedback.errors.map((errItem, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                >
                  <div className="flex items-start gap-2 text-rose-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="line-through">{errItem.sentence}</span>
                  </div>
                  <div className="mt-1.5 flex items-start gap-2 font-semibold text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errItem.correction}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {errItem.explanation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Грамматических и лексических ошибок не обнаружено!
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
