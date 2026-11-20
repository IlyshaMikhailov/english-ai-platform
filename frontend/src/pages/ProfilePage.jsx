import { useEffect, useState } from "react";
import { Award, CheckCircle2, HelpCircle, Loader2, User } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";

const LEVELS = ["A2", "B1", "B2"];

const TASK_TYPE_LABELS = {
  test: "Тест",
  gamified: "Конструктор",
  essay: "Эссе (ИИ)",
};

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const openOnboardingTour = useAuthStore((s) => s.openOnboardingTour);

  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingLevel, setSavingLevel] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProgress() {
      setLoading(true);
      try {
        const data = await api.fetchMyProgress();
        if (!cancelled) setProgress(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLevelChange(newLevel) {
    if (!user || newLevel === user.level || savingLevel) return;
    setSavingLevel(true);
    setStatusMessage("");
    try {
      await updateProfile({ level: newLevel });
      setStatusMessage(`Уровень обновлён на ${newLevel}.`);
    } finally {
      setSavingLevel(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {user?.username}
              </h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openOnboardingTour}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <HelpCircle className="h-4 w-4" />
            Открыть гид по платформе
          </button>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Ваш уровень английского (фильтрует темы на главной)
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                disabled={savingLevel}
                onClick={() => handleLevelChange(lvl)}
                className={`rounded-xl border px-5 py-2 text-sm font-bold transition ${
                  user?.level === lvl
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {lvl}
              </button>
            ))}
            {statusMessage && (
              <span className="text-xs font-medium text-emerald-700">
                {statusMessage}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              История прогресса
            </h2>
            <p className="text-sm text-slate-500">
              Все выполненные тесты, игры и проверенные эссе
            </p>
          </div>
          {progress && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Выполнено: {progress.completed_tasks}
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700">
                <Award className="h-4 w-4" />
                Средний балл: {progress.average_score}/10
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
            Загружаем историю...
          </div>
        ) : !progress || progress.records.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            Вы ещё не выполнили ни одного задания. Откройте любую тему на
            главной странице!
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {progress.records.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {TASK_TYPE_LABELS[item.task_type] || item.task_type}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {item.topic_title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.score >= 8
                          ? "bg-emerald-100 text-emerald-800"
                          : item.score >= 5
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {item.score} / 10
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.completed_at).toLocaleString("ru-RU")}
                    </span>
                  </div>
                </div>

                {item.ai_feedback?.feedback && (
                  <p className="mt-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
                    {item.ai_feedback.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
