import { Link, NavLink, Outlet } from "react-router-dom";
import { BookOpen, GraduationCap, LogOut, ShieldCheck, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import OnboardingWidget from "./OnboardingWidget";

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const navClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Lingua<span className="text-indigo-600">AI</span>
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={navClass}>
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Модули</span>
              </NavLink>
              <NavLink to="/profile" className={navClass}>
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Профиль</span>
              </NavLink>
              {user?.is_admin && (
                <NavLink to="/admin" className={navClass}>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="hidden sm:inline font-semibold text-emerald-700">
                    Админ-панель
                  </span>
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {user?.is_admin ? (
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm">
                Администратор
              </span>
            ) : (
              user && (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  Уровень {user.level}
                </span>
              )
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <OnboardingWidget />
    </div>
  );
}
