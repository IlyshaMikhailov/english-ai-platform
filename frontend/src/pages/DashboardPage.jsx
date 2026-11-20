import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";

const FILTER_OPTIONS = [
  { key: "MY", label: "Мой уровень" },
  { key: "A2", label: "A2" },
  { key: "B1", label: "B1" },
  { key: "B2", label: "B2" },
  { key: "ALL", label: "Все уровни" },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState("MY");
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const topicParams =
          filter === "ALL"
            ? { allLevels: true }
            : filter === "MY"
              ? {}
              : { level: filter };

        const [topicsRes, progressRes] = await Promise.all([
          api.fetchTopics(topicParams),
          api.fetchMyProgress(),
        ]);
        if (!cancelled) {
          setTopics(topicsRes);
          setProgress(progressRes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Не удалось загрузить учебные модули.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [filter, user?.level]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 p-7 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Персональный трек — уровень {user?.level}
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
              С возвращением, {user?.username}!
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-indigo-100">
              Изучайте теорию, тренируйтесь в интерактивных заданиях с
              сократовским ИИ-репетитором и загружайте эссе на автоматическую
              проверку.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-indigo-100">
                <CheckCircle className="h-4 w-4" />
                Попыток заданий
              </div>
              <p className="mt-1 text-2xl font-bold">
                {progress?.completed_tasks ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-indigo-100">
                <Award className="h-4 w-4" />
                Средний балл
              </div>
              <p className="mt-1 text-2xl font-bold">
                {progress ? `${progress.average_score}/10` : "0/10"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Учебные темы</h2>
            <p className="text-sm text-slate-500">
              Выберите модуль для изучения теории и выполнения практики
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  filter === opt.key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
            Загружаем темы...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {error}
          </div>
        ) : topics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            Для выбранного фильтра пока нет учебных модулей.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                      {topic.level}
                    </span>
                    <BookOpen className="h-4 w-4 text-slate-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {topic.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                    {topic.description}
                  </p>
                </div>

                <Link
                  to={`/topics/${topic.id}`}
                  className="mt-6 inline-flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                >
                  <span>Открыть модуль</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
