import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Dumbbell, Loader2 } from "lucide-react";
import DragAndDropGame from "../components/DragAndDropGame";
import HomeworkUploader from "../components/HomeworkUploader";
import InteractiveTask from "../components/InteractiveTask";
import MaterialSelector from "../components/MaterialSelector";
import SocraticChat from "../components/SocraticChat";
import { api } from "../services/api";

export default function TopicPage() {
  const { topicId } = useParams();
  const [topic, setTopic] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("theory");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tutorState, setTutorState] = useState({
    isOpen: false,
    task: null,
    wrongAnswer: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadTopic() {
      setLoading(true);
      setError("");
      try {
        const [topicRes, tasksRes] = await Promise.all([
          api.fetchTopic(topicId),
          api.fetchTopicTasks(topicId),
        ]);
        if (!cancelled) {
          setTopic(topicRes);
          setTasks(tasksRes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Не удалось загрузить материалы темы.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTopic();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  function openTutorForTask(task, wrongAnswer) {
    setTutorState({
      isOpen: true,
      task,
      wrongAnswer: wrongAnswer || "",
    });
  }

  function closeTutor() {
    setTutorState((prev) => ({ ...prev, isOpen: false }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        Загружаем учебный модуль...
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к темам
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error || "Тема не найдена."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад ко всем темам
        </Link>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
            Уровень {topic.level}
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            {topic.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {topic.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setActiveTab("theory")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "theory"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Теория и материалы
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("practice")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "practice"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Dumbbell className="h-4 w-4" />
              Практика ({tasks.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === "theory" ? (
        <MaterialSelector topic={topic} />
      ) : (
        <div className="space-y-6">
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              В этой теме пока нет заданий.
            </div>
          ) : (
            tasks.map((task) => {
              if (task.type === "test") {
                return (
                  <InteractiveTask
                    key={task.id}
                    task={task}
                    onNeedTutor={openTutorForTask}
                  />
                );
              }
              if (task.type === "gamified") {
                return (
                  <DragAndDropGame
                    key={task.id}
                    task={task}
                    onNeedTutor={openTutorForTask}
                  />
                );
              }
              return <HomeworkUploader key={task.id} task={task} />;
            })
          )}
        </div>
      )}

      <SocraticChat
        isOpen={tutorState.isOpen}
        onClose={closeTutor}
        task={tutorState.task}
        wrongAnswer={tutorState.wrongAnswer}
      />
    </div>
  );
}
