import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, HelpCircle, Send, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import FormattedText from "./FormattedText";

const SCENARIOS = [
  {
    id: "theory",
    label: "Где найти теорию по теме?",
    keywords: ["теор", "видео", "презентац", "материал", "урок", "изуч", "слайд"],
    reply: [
      "Теория находится внутри каждой учебной темы:",
      "1. Откройте раздел **Модули** и выберите карточку темы.",
      "2. На вкладке **Теория и материалы** нажмите «Смотреть видео» или «Читать презентацию».",
    ].join("\n"),
  },
  {
    id: "practice",
    label: "Как работают задания и ИИ-репетитор?",
    keywords: [
      "задан",
      "практ",
      "тест",
      "репетитор",
      "ошибк",
      "эссе",
      "картинк",
      "подчерк",
      "провер",
    ],
    reply: [
      "Внутри темы откройте вкладку **Практика**:",
      "• **Задания с картинками, тесты и подчёркивание** проверяются мгновенно. При ошибке включается **умный ИИ-разбор** и сократовский чат-репетитор.",
      "• **Эссе** можно загрузить в `.txt` или ввести текстом — ИИ оценит грамматику, лексику и смысл по шкале 1–10.",
    ].join("\n"),
  },
  {
    id: "progress",
    label: "Где отслеживать свой прогресс?",
    keywords: ["прогресс", "профил", "балл", "оценк", "статист", "уровен", "a2", "b1", "b2"],
    reply: [
      "Вся статистика собрана в разделе **Профиль**:",
      "• Количество выполненных заданий и средний балл (0–10).",
      "• Полная история попыток и разборы эссе.",
      "• Переключатель вашего уровня (**A2 / B1 / B2**), от которого зависят темы на главной.",
    ].join("\n"),
  },
];

const GREETING_KEYWORDS = ["привет", "здравств", "хай", "помощ", "старт", "начать", "экскурс"];

const UNKNOWN_QUESTION_REPLY = [
  "Я пока не знаю, как ответить на этот вопрос.",
  "Я работаю по готовым сценариям навигации — выберите одну из кнопок ниже или спросите про **теорию**, **задания** или **прогресс**.",
].join("\n");

function buildInitialGreeting(user) {
  const name = user?.username || "друг";
  const level = user?.level || "A2";
  return [
    `Привет, ${name}! Добро пожаловать на платформу (уровень ${level}).`,
    "",
    "1. **Модули (главная):** выберите тему и откройте её.",
    "2. **Внутри темы:** изучите «Теорию и материалы», затем перейдите во вкладку «Практика».",
    "3. **Профиль:** здесь ваш уровень, средний балл и история всех заданий.",
    "",
    "Нажмите на любую подсказку ниже или задайте вопрос о платформе.",
  ].join("\n");
}

function resolveScenarioReply(question, user) {
  const normalized = question.trim().toLowerCase();

  if (GREETING_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return buildInitialGreeting(user);
  }

  for (const scenario of SCENARIOS) {
    if (
      normalized === scenario.label.toLowerCase() ||
      scenario.keywords.some((kw) => normalized.includes(kw))
    ) {
      return scenario.reply;
    }
  }

  return UNKNOWN_QUESTION_REPLY;
}

export default function OnboardingWidget() {
  const user = useAuthStore((s) => s.user);
  const onboardingForceOpen = useAuthStore((s) => s.onboardingForceOpen);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const openOnboardingTour = useAuthStore((s) => s.openOnboardingTour);
  const closeOnboardingTour = useAuthStore((s) => s.closeOnboardingTour);

  const isVisible = Boolean(user && (user.is_first_login || onboardingForceOpen));

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const hasGreetedRef = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isVisible) {
      hasGreetedRef.current = false;
      return;
    }
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    setMessages([{ role: "assistant", content: buildInitialGreeting(user) }]);
  }, [isVisible, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendQuestion(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const reply = resolveScenarioReply(trimmed, user);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: reply },
    ]);
    setInput("");
  }

  async function handleFinish() {
    setIsCompleting(true);
    try {
      if (user?.is_first_login) {
        await completeOnboarding();
      } else {
        closeOnboardingTour();
      }
    } finally {
      setIsCompleting(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={openOnboardingTour}
            aria-label="Открыть гид по платформе"
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:from-indigo-700 hover:to-violet-700"
          >
            <HelpCircle className="h-5 w-5" />
            <span>Гид по платформе</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 right-5 z-50 w-[390px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight">
                    Гид по платформе
                  </h3>
                  <p className="text-xs text-indigo-100">
                    Быстрые подсказки и сценарии
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isCompleting}
                title="Свернуть гид"
                className="rounded-lg p-1 text-indigo-100 transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    <FormattedText
                      text={msg.content}
                      inverse={msg.role === "user"}
                    />
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-100 bg-white px-3 pt-2.5 pb-3">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => sendQuestion(scenario.label)}
                    className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendQuestion(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Спросите о теории, заданиях или прогрессе..."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              <button
                type="button"
                onClick={handleFinish}
                disabled={isCompleting}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCompleting
                  ? "Сохраняем..."
                  : "Понятно, свернуть гид"}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
