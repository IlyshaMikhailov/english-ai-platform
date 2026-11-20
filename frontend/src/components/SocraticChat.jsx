import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { buildTutorWebSocketUrl } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import FormattedText from "./FormattedText";

export default function SocraticChat({ isOpen, onClose, task, wrongAnswer }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [messages, setMessages] = useState([]);
  const [streamingReply, setStreamingReply] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [errorText, setErrorText] = useState("");
  const [input, setInput] = useState("");

  const wsRef = useRef(null);
  const autoPromptedRef = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !user || !task) {
      return undefined;
    }

    autoPromptedRef.current = false;
    setMessages([]);
    setStreamingReply("");
    setIsStreaming(false);
    setErrorText("");
    setConnectionState("connecting");

    const wsUrl = buildTutorWebSocketUrl(user.id, task.id, token);
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnectionState("connected");
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "history") {
        const saved = Array.isArray(data.messages) ? data.messages : [];
        setMessages(saved);
        if (saved.length === 0 && wrongAnswer && !autoPromptedRef.current) {
          autoPromptedRef.current = true;
          const initialMsg = `Мой ответ был «${wrongAnswer}». Помоги мне понять ошибку без прямого ответа.`;
          setMessages([{ role: "user", content: initialMsg }]);
          socket.send(
            JSON.stringify({
              message: initialMsg,
              wrong_answer: wrongAnswer,
            })
          );
        }
      } else if (data.type === "start") {
        setErrorText("");
        setIsStreaming(true);
        setStreamingReply("");
      } else if (data.type === "chunk") {
        setStreamingReply((prev) => prev + (data.content || ""));
      } else if (data.type === "end") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content || "" },
        ]);
        setStreamingReply("");
        setIsStreaming(false);
      } else if (data.type === "error") {
        setErrorText(data.detail || "Ошибка соединения с ИИ-репетитором.");
        setStreamingReply("");
        setIsStreaming(false);
      }
    };

    socket.onerror = () => {
      setErrorText("Не удалось подключиться к каналу ИИ-репетитора.");
      setConnectionState("error");
      setIsStreaming(false);
    };

    socket.onclose = () => {
      setConnectionState("disconnected");
      setIsStreaming(false);
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [isOpen, user?.id, task?.id, token, wrongAnswer]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingReply, isStreaming]);

  function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    setErrorText("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    wsRef.current.send(
      JSON.stringify({
        message: trimmed,
        wrong_answer: wrongAnswer || undefined,
      })
    );
  }

  function handleReset() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isStreaming) {
      return;
    }
    setErrorText("");
    wsRef.current.send(JSON.stringify({ type: "reset" }));
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-5 right-5 z-50 flex h-[540px] max-h-[85vh] w-[430px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl"
        >
            <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    Сократовский ИИ-репетитор
                  </h3>
                  <p className="text-xs text-slate-300">
                    {connectionState === "connected"
                      ? "Наводящие подсказки без прямых ответов"
                      : connectionState === "connecting"
                        ? "Подключение..."
                        : "Соединение закрыто"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isStreaming || connectionState !== "connected"}
                  title="Очистить историю диалога"
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  title="Закрыть чат"
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {(task?.content?.question || task?.content?.title) && (
              <div className="border-b border-slate-200 bg-indigo-50/60 px-5 py-2.5 text-xs text-slate-700">
                <span className="font-semibold text-indigo-700">Задание: </span>
                {task.content.question || task.content.title}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {messages.length === 0 && !isStreaming && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                  Напишите, почему вы выбрали этот вариант или как рассуждали —
                  репетитор направит вас к верному решению.
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-white text-slate-800 shadow-sm"
                    }`}
                  >
                    <FormattedText
                      text={msg.content}
                      inverse={msg.role === "user"}
                    />
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm">
                    {streamingReply ? (
                      <FormattedText text={streamingReply} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        Репетитор формулирует вопрос...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {errorText && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                  {errorText}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-slate-200 bg-white p-3.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming || connectionState !== "connected"}
                placeholder="Ваш ответ или вопрос репетитору..."
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  isStreaming ||
                  connectionState !== "connected"
                }
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                Отправить
              </button>
            </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
