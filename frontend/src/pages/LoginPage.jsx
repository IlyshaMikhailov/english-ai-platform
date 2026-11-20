import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const LEVELS = ["A2", "B1", "B2"];

export default function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginDemo = useAuthStore((s) => s.loginDemo);
  const loginAdminDemo = useAuthStore((s) => s.loginAdminDemo);

  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("A2");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to={user.is_admin ? "/admin" : "/"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "login") {
        await login(identifier, password);
      } else {
        await register({ username, email, password, level });
      }
    } catch (err) {
      setError(err.message || "Ошибка аутентификации.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setSubmitting(true);
    setError("");
    try {
      await loginDemo();
    } catch (err) {
      setError(err.message || "Не удалось войти под демо-профилем.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminDemoLogin() {
    setSubmitting(true);
    setError("");
    try {
      await loginAdminDemo();
    } catch (err) {
      setError(err.message || "Не удалось войти под профилем администратора.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Lingua<span className="text-indigo-600">AI</span>
            </h1>
            <p className="text-xs text-slate-500">
              Адаптивная платформа английского с локальной LLM
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            Вход: Demo-ученик
          </button>

          <button
            type="button"
            onClick={handleAdminDemoLogin}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Вход: Администратор
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>или используйте аккаунт</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-lg py-2 transition ${
              mode === "login"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`rounded-lg py-2 transition ${
              mode === "register"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "login" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Имя пользователя или Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="demo_student"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_learner"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Начальный уровень английского
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`rounded-xl border py-2 text-sm font-bold transition ${
                        level === lvl
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Пароль
            </label>
            <input
              type="password"
              required
              minLength={mode === "register" ? 6 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {mode === "login" ? (
              <>
                <LogIn className="h-4 w-4" />
                Войти
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Создать аккаунт
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
