import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Gamepad2,
  GraduationCap,
  Layers,
  ListOrdered,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api } from "../services/api";

const LEVELS = ["A2", "B1", "B2"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("topics"); // "topics" | "submissions" | "students"

  const [overview, setOverview] = useState(null);
  const [topicsWithTasks, setTopicsWithTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [showCreateTopicModal, setShowCreateTopicModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [targetTopicForTask, setTargetTopicForTask] = useState(null);
  const [selectedFeedbackModal, setSelectedFeedbackModal] = useState(null);

  // Expanded topics state
  const [expandedTopics, setExpandedTopics] = useState({});

  // Search and filter state
  const [submissionSearch, setSubmissionSearch] = useState("");

  // Create Topic Form
  const [topicForm, setTopicForm] = useState({
    title: "",
    description: "",
    level: "A2",
    video_url: "",
    presentation_url: "",
  });

  // Create Task Form
  const [taskFormType, setTaskFormType] = useState("test"); // "test" | "gamified" | "essay"
  const [testForm, setTestForm] = useState({
    title: "",
    question: "",
    optA: "",
    optB: "",
    optC: "",
    optD: "",
    correct_answer: "",
    explanation: "",
  });
  const [gamifiedForm, setGamifiedForm] = useState({
    title: "",
    instruction: "Соберите предложение из предложенных слов в правильном порядке.",
    correct_sentence: "",
    words: "",
    hint: "",
  });
  const [essayForm, setEssayForm] = useState({
    title: "",
    prompt: "",
    min_words: 40,
    max_words: 150,
    rubricText: "Грамматическая точность\nБогатый словарный запас\nЛогика и структура",
  });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [ov, tWithT, subs, stus] = await Promise.all([
        api.fetchAdminOverview(),
        api.fetchAdminTopicsWithTasks(),
        api.fetchAdminSubmissions({ limit: 150 }),
        api.fetchAdminStudents(),
      ]);
      setOverview(ov);
      setTopicsWithTasks(tWithT);
      setSubmissions(subs);
      setStudents(stus);

      // Auto-expand first topic
      if (tWithT.length > 0 && Object.keys(expandedTopics).length === 0) {
        setExpandedTopics({ [tWithT[0].topic.id]: true });
      }
    } catch (err) {
      setError(err.message || "Ошибка загрузки административных данных.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function toggleTopicExpand(id) {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCreateTopic(e) {
    e.preventDefault();
    if (!topicForm.title.trim() || !topicForm.description.trim()) {
      setError("Укажите название и описание модуля.");
      return;
    }
    try {
      await api.createTopic({
        title: topicForm.title.trim(),
        description: topicForm.description.trim(),
        level: topicForm.level,
        video_url: topicForm.video_url.trim() || null,
        presentation_url: topicForm.presentation_url.trim() || null,
      });
      setShowCreateTopicModal(false);
      setTopicForm({
        title: "",
        description: "",
        level: "A2",
        video_url: "",
        presentation_url: "",
      });
      setSuccessMsg("Новый модуль успешно создан!");
      setTimeout(() => setSuccessMsg(""), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || "Не удалось создать модуль.");
    }
  }

  async function handleDeleteTopic(topicId, title) {
    if (!window.confirm(`Вы уверены, что хотите удалить модуль «${title}» и все его задания?`)) {
      return;
    }
    try {
      await api.deleteTopic(topicId);
      setSuccessMsg(`Модуль «${title}» удалён.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || "Ошибка удаления модуля.");
    }
  }

  function openAddTaskModal(topic) {
    setTargetTopicForTask(topic);
    setTaskFormType("test");
    setTestForm({
      title: "",
      question: "",
      optA: "",
      optB: "",
      optC: "",
      optD: "",
      correct_answer: "",
      explanation: "",
    });
    setGamifiedForm({
      title: "",
      instruction: "Соберите предложение из предложенных слов в правильном порядке.",
      correct_sentence: "",
      words: "",
      hint: "",
    });
    setEssayForm({
      title: "",
      prompt: "",
      min_words: 40,
      max_words: 150,
      rubricText: "Грамматическая точность\nБогатый словарный запас\nЛогика и структура",
    });
    setShowCreateTaskModal(true);
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!targetTopicForTask) return;

    let content = {};
    const order = (targetTopicForTask.tasks?.length || 0) + 1;

    if (taskFormType === "test") {
      const options = [testForm.optA, testForm.optB, testForm.optC, testForm.optD]
        .map((s) => s.trim())
        .filter(Boolean);
      if (!testForm.question.trim() || options.length < 2 || !testForm.correct_answer.trim()) {
        setError("Для теста требуется вопрос, минимум 2 варианта и правильный ответ.");
        return;
      }
      content = {
        order,
        title: testForm.title.trim() || `Тест: ${testForm.question.slice(0, 30)}...`,
        question: testForm.question.trim(),
        options,
        correct_answer: testForm.correct_answer.trim(),
        explanation: testForm.explanation.trim() || undefined,
      };
    } else if (taskFormType === "gamified") {
      if (!gamifiedForm.correct_sentence.trim()) {
        setError("Укажите правильное предложение для конструктора.");
        return;
      }
      let words = gamifiedForm.words
        .split(/[,\s]+/)
        .map((w) => w.trim())
        .filter(Boolean);
      if (words.length === 0) {
        words = gamifiedForm.correct_sentence.trim().split(/\s+/).sort(() => Math.random() - 0.5);
      }
      content = {
        order,
        title: gamifiedForm.title.trim() || "Конструктор предложения",
        instruction: gamifiedForm.instruction.trim(),
        correct_sentence: gamifiedForm.correct_sentence.trim(),
        words,
        hint: gamifiedForm.hint.trim() || undefined,
      };
    } else if (taskFormType === "essay") {
      if (!essayForm.prompt.trim()) {
        setError("Укажите тему и инструкцию для написания эссе.");
        return;
      }
      const rubric = essayForm.rubricText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      content = {
        order,
        title: essayForm.title.trim() || "Творческое эссе",
        prompt: essayForm.prompt.trim(),
        min_words: Number(essayForm.min_words) || 40,
        max_words: Number(essayForm.max_words) || 200,
        rubric: rubric.length ? rubric : ["Соответствие теме", "Грамматика"],
      };
    }

    try {
      await api.createTopicTask(targetTopicForTask.id, {
        type: taskFormType,
        content,
      });
      setShowCreateTaskModal(false);
      setSuccessMsg(`Задание успешно добавлено в модуль «${targetTopicForTask.title}»!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || "Ошибка добавления задания.");
    }
  }

  async function handleDeleteTask(taskId, taskTitle) {
    if (!window.confirm(`Удалить задание «${taskTitle}»?`)) return;
    try {
      await api.deleteTask(taskId);
      setSuccessMsg(`Задание удалено.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || "Ошибка при удалении задания.");
    }
  }

  const filteredSubmissions = submissions.filter((s) => {
    if (!submissionSearch) return true;
    const q = submissionSearch.toLowerCase();
    return (
      s.student_name.toLowerCase().includes(q) ||
      s.student_email.toLowerCase().includes(q) ||
      s.topic_title.toLowerCase().includes(q) ||
      s.task_title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header and overview */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400 shadow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Панель администратора</h1>
              <p className="text-xs text-slate-500">
                Управление курсами, создание модулей, добавление заданий и аналитика успеваемости учеников
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Обновить данные
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Ученики</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{overview.total_students}</div>
            <p className="mt-1 text-xs text-slate-400">Зарегистрировано</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Модули</span>
              <BookOpen className="h-4 w-4 text-violet-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{overview.total_topics}</div>
            <p className="mt-1 text-xs text-slate-400">Учебных тем</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Задания</span>
              <ListOrdered className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{overview.total_tasks}</div>
            <p className="mt-1 text-xs text-slate-400">Практических задач</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Решений</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{overview.total_submissions}</div>
            <p className="mt-1 text-xs text-slate-400">Проверено ИИ</p>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Средний балл</span>
              <Award className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">
              {overview.average_score} <span className="text-sm font-normal text-slate-400">/ 10</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Успеваемость</p>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("topics")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "topics"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Модули и задания ({topicsWithTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("submissions")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "submissions"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Результаты учеников ({submissions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "students"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          Список учеников ({students.length})
        </button>
      </div>

      {/* Tab 1: Topics and Tasks */}
      {activeTab === "topics" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Учебный план платформы</h2>
              <p className="text-xs text-slate-500">
                Создавайте новые модули, редактируйте темы и добавляйте упражнения всех форматов
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateTopicModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Создать новый модуль
            </button>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : topicsWithTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
              Модулей пока нет. Нажмите «Создать новый модуль», чтобы добавить первый урок.
            </div>
          ) : (
            <div className="space-y-4">
              {topicsWithTasks.map(({ topic, tasks }) => {
                const isExpanded = !!expandedTopics[topic.id];
                return (
                  <div
                    key={topic.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`rounded-xl px-2.5 py-1 text-xs font-black ${
                            topic.level === "A2"
                              ? "bg-emerald-100 text-emerald-800"
                              : topic.level === "B1"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {topic.level}
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{topic.title}</h3>
                          <p className="mt-0.5 max-w-2xl text-xs text-slate-500 line-clamp-1">
                            {topic.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {tasks.length} заданий
                        </span>

                        <button
                          type="button"
                          onClick={() => openAddTaskModal(topic)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Добавить задание
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(topic.id, topic.title)}
                          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Удалить модуль"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleTopicExpand(topic.id)}
                          className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Задания модуля ({tasks.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => openAddTaskModal(topic)}
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            + Добавить ещё одно задание
                          </button>
                        </div>

                        {tasks.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                            В этом модуле пока нет заданий. Нажмите «Добавить задание», чтобы добавить тест или эссе.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {tasks.map((task, idx) => {
                              const tTitle =
                                (task.content || {}).title ||
                                (task.content || {}).question ||
                                `${task.type} #${idx + 1}`;
                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs"
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                                        task.type === "test"
                                          ? "bg-blue-100 text-blue-800"
                                          : task.type === "gamified"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-purple-100 text-purple-800"
                                      }`}
                                    >
                                      {task.type === "test" && <ListOrdered className="h-3 w-3" />}
                                      {task.type === "gamified" && <Gamepad2 className="h-3 w-3" />}
                                      {task.type === "essay" && <FileText className="h-3 w-3" />}
                                      {task.type === "test"
                                        ? "Тест"
                                        : task.type === "gamified"
                                          ? "Геймификация"
                                          : "Эссе"}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">
                                      {tTitle}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(task.id, tTitle)}
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    title="Удалить задание"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Learner Submissions */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Результаты решений обучающихся</h2>
              <p className="text-xs text-slate-500">
                Полная история ответов учеников с оценками и детализированной обратной связью локальной LLM
              </p>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                placeholder="Поиск по ученику или модулю..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
              Пока нет выполненных заданий или ничего не найдено по запросу.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Дата</th>
                      <th className="px-5 py-3.5">Ученик</th>
                      <th className="px-5 py-3.5">Модуль</th>
                      <th className="px-5 py-3.5">Задание</th>
                      <th className="px-5 py-3.5">Оценка</th>
                      <th className="px-5 py-3.5 text-right">Разбор ИИ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const dateStr = new Date(sub.completed_at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const isPerfect = sub.score >= 9.0;
                      const isGood = sub.score >= 6.0;

                      return (
                        <tr key={sub.id} className="transition hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">
                            {dateStr}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{sub.student_name}</div>
                            <div className="text-[11px] text-slate-400">{sub.student_email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-800">{sub.topic_title}</span>
                            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              {sub.topic_level}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-700">{sub.task_title}</div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400">
                              {sub.task_type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                isPerfect
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isGood
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {sub.score.toFixed(1)} / 10
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right">
                            {sub.ai_feedback ? (
                              <button
                                type="button"
                                onClick={() => setSelectedFeedbackModal(sub)}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100"
                              >
                                <Sparkles className="h-3 w-3" />
                                Смотреть фидбек
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Students list */}
      {activeTab === "students" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Зарегистрированные ученики</h2>
            <p className="text-xs text-slate-500">
              Список обучающихся платформы, уровни подготовки и статистика завершённых заданий
            </p>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
              Студенты пока не зарегистрированы.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Ученик</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Текущий уровень</th>
                      <th className="px-5 py-3.5">Решено заданий</th>
                      <th className="px-5 py-3.5">Средний балл</th>
                      <th className="px-5 py-3.5">Дата регистрации</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((stu) => {
                      const regDate = new Date(stu.created_at).toLocaleDateString("ru-RU");
                      return (
                        <tr key={stu.id} className="transition hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-900">
                            {stu.username}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                            {stu.email}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-black ${
                                stu.level === "A2"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : stu.level === "B1"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {stu.level}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-800">
                            {stu.completed_count}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <span className="font-bold text-slate-900">{stu.average_score}</span> / 10
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">
                            {regDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Topic */}
      <AnimatePresence>
        {showCreateTopicModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Создать новый учебный модуль</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateTopicModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTopic} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700">
                    Название модуля <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Future Simple"
                    value={topicForm.title}
                    onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">
                    Уровень сложности (CEFR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setTopicForm({ ...topicForm, level: lvl })}
                        className={`flex-1 rounded-xl py-2 font-bold transition ${
                          topicForm.level === lvl
                            ? "bg-indigo-600 text-white shadow"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700">
                    Описание модуля <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Чему ученик научится в этом модуле..."
                    value={topicForm.description}
                    onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">
                    Ссылка на видеоматериал (MP4 / YouTube)
                  </label>
                  <input
                    type="text"
                    placeholder="https://... или /static/lessons/video.mp4"
                    value={topicForm.video_url}
                    onChange={(e) => setTopicForm({ ...topicForm, video_url: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">
                    Ссылка на презентацию (.pptx / Google Slides)
                  </label>
                  <input
                    type="text"
                    placeholder="https://... или /static/lessons/presentation.pptx"
                    value={topicForm.presentation_url}
                    onChange={(e) =>
                      setTopicForm({ ...topicForm, presentation_url: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateTopicModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow hover:bg-indigo-700"
                  >
                    Создать модуль
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Create Task in Topic */}
      <AnimatePresence>
        {showCreateTaskModal && targetTopicForTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Добавить задание</h3>
                  <p className="text-xs text-slate-500">В модуль «{targetTopicForTask.title}»</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Task Type selector */}
              <div className="mt-5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTaskFormType("test")}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
                    taskFormType === "test"
                      ? "border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <ListOrdered className="h-5 w-5" />
                  <span className="text-xs font-bold">Тест (Choice)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskFormType("gamified")}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
                    taskFormType === "gamified"
                      ? "border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Gamepad2 className="h-5 w-5" />
                  <span className="text-xs font-bold">Конструктор</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskFormType("essay")}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
                    taskFormType === "essay"
                      ? "border-purple-500 bg-purple-50/70 text-purple-900 ring-2 ring-purple-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs font-bold">Эссе</span>
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="mt-5 space-y-4 text-xs">
                {/* TEST FORM */}
                {taskFormType === "test" && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700">Заголовок задания</label>
                      <input
                        type="text"
                        placeholder="Например: Выбор правильной формы глагола"
                        value={testForm.title}
                        onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        Вопрос / Предложение с пропуском <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="She ___ to work every day."
                        value={testForm.question}
                        onChange={(e) => setTestForm({ ...testForm, question: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700">Вариант A *</label>
                        <input
                          type="text"
                          required
                          value={testForm.optA}
                          onChange={(e) => setTestForm({ ...testForm, optA: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700">Вариант B *</label>
                        <input
                          type="text"
                          required
                          value={testForm.optB}
                          onChange={(e) => setTestForm({ ...testForm, optB: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700">Вариант C</label>
                        <input
                          type="text"
                          value={testForm.optC}
                          onChange={(e) => setTestForm({ ...testForm, optC: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700">Вариант D</label>
                        <input
                          type="text"
                          value={testForm.optD}
                          onChange={(e) => setTestForm({ ...testForm, optD: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        Точный правильный ответ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Должен в точности совпадать с одним из вариантов"
                        value={testForm.correct_answer}
                        onChange={(e) => setTestForm({ ...testForm, correct_answer: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">Пояснение для ученика</label>
                      <input
                        type="text"
                        placeholder="Правило или причина, почему этот ответ верен"
                        value={testForm.explanation}
                        onChange={(e) => setTestForm({ ...testForm, explanation: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </>
                )}

                {/* GAMIFIED (SENTENCE BUILDER) FORM */}
                {taskFormType === "gamified" && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700">Заголовок задания</label>
                      <input
                        type="text"
                        placeholder="Конструктор предложения"
                        value={gamifiedForm.title}
                        onChange={(e) => setGamifiedForm({ ...gamifiedForm, title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        Правильное предложение <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="She always reads books in the evening."
                        value={gamifiedForm.correct_sentence}
                        onChange={(e) =>
                          setGamifiedForm({ ...gamifiedForm, correct_sentence: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        Слова для сборки (через пробел, оставьте пустым для автогенерации)
                      </label>
                      <input
                        type="text"
                        placeholder="reads evening. always She the in books"
                        value={gamifiedForm.words}
                        onChange={(e) => setGamifiedForm({ ...gamifiedForm, words: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">Подсказка для ученика</label>
                      <input
                        type="text"
                        placeholder="Например: наречие always ставится перед глаголом"
                        value={gamifiedForm.hint}
                        onChange={(e) => setGamifiedForm({ ...gamifiedForm, hint: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </>
                )}

                {/* ESSAY FORM */}
                {taskFormType === "essay" && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700">Название темы эссе</label>
                      <input
                        type="text"
                        placeholder="Моё идеальное путешествие"
                        value={essayForm.title}
                        onChange={(e) => setEssayForm({ ...essayForm, title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        Инструкция и условие задания <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Напишите короткое эссе о..."
                        value={essayForm.prompt}
                        onChange={(e) => setEssayForm({ ...essayForm, prompt: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700">Мин. слов</label>
                        <input
                          type="number"
                          value={essayForm.min_words}
                          onChange={(e) => setEssayForm({ ...essayForm, min_words: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700">Макс. слов</label>
                        <input
                          type="number"
                          value={essayForm.max_words}
                          onChange={(e) => setEssayForm({ ...essayForm, max_words: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        Критерии оценки (по одному на строку)
                      </label>
                      <textarea
                        rows={3}
                        value={essayForm.rubricText}
                        onChange={(e) => setEssayForm({ ...essayForm, rubricText: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateTaskModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow hover:bg-indigo-700"
                  >
                    Сохранить задание
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: View AI Feedback Details */}
      <AnimatePresence>
        {selectedFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Анализ и оценка работы (ИИ-тьютор)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFeedbackModal(null)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <span className="font-bold text-slate-900">
                      {selectedFeedbackModal.student_name}
                    </span>
                    <span className="ml-2 text-slate-500">
                      ({selectedFeedbackModal.student_email})
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                    Балл: {selectedFeedbackModal.score.toFixed(1)} / 10
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800">Задание:</h4>
                  <p className="mt-0.5 text-slate-600">
                    {selectedFeedbackModal.topic_title} — {selectedFeedbackModal.task_title}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800">Педагогический отзыв LLM:</h4>
                  <div className="mt-1.5 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                    {selectedFeedbackModal.ai_feedback?.feedback ||
                      selectedFeedbackModal.ai_feedback?.analysis ||
                      JSON.stringify(selectedFeedbackModal.ai_feedback, null, 2)}
                  </div>
                </div>

                {Array.isArray(selectedFeedbackModal.ai_feedback?.errors) &&
                  selectedFeedbackModal.ai_feedback.errors.length > 0 && (
                    <div>
                      <h4 className="font-bold text-rose-700">Выявленные ошибки:</h4>
                      <ul className="mt-1 space-y-1 text-slate-600">
                        {selectedFeedbackModal.ai_feedback.errors.map((err, i) => (
                          <li key={i} className="rounded-lg bg-rose-50/70 p-2 text-rose-800">
                            • {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedFeedbackModal(null)}
                    className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
