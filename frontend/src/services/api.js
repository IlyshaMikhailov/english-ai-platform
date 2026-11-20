import { MOCK_STUDENT_USER, MOCK_ADMIN_USER, MOCK_TOPICS } from "./mockData";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "english_platform_token";

const ONBOARDING_GUIDE_TEXT = `Привет! Конечно, рад помочь!

1. **Главная страница (Dashboard)**:
- Здесь вы видите карточки с темами вашего уровня (A2). Кликните по любой карточке, чтобы перейти к изучению.

2. **Страница темы (Topic)**:
- Вкладка «Теория»: содержит видео или презентации для усвоения теории.
- Вкладка «Задания»: интерактивные задания для практики (сопоставление, выбор правильного ответа, пропуски, эссе).

3. **Профиль (Profile)**:
- Здесь вы видите ваш уровень (A2), статистику баллов и историю прогресса.

Чтобы начать:
- Изучайте теорию на странице темы.
- Решайте задания там же, чтобы закрепить знания.
- Отслеживайте свой прогресс в профиле.

Если у вас возникнут вопросы, обращайтесь!`;

function handleMockRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  if (path === "/api/v1/auth/demo") {
    localStorage.setItem("mock_user_role", "student");
    return {
      access_token: "mock-student-token",
      token_type: "bearer",
      user: MOCK_STUDENT_USER,
    };
  }

  if (path === "/api/v1/auth/admin-demo") {
    localStorage.setItem("mock_user_role", "admin");
    return {
      access_token: "mock-admin-token",
      token_type: "bearer",
      user: MOCK_ADMIN_USER,
    };
  }

  if (path === "/api/v1/auth/login" || path === "/api/v1/auth/register") {
    const isMockAdmin = localStorage.getItem("mock_user_role") === "admin";
    return {
      access_token: "mock-token",
      token_type: "bearer",
      user: isMockAdmin ? MOCK_ADMIN_USER : MOCK_STUDENT_USER,
    };
  }

  if (path === "/api/v1/users/me") {
    const role = localStorage.getItem("mock_user_role");
    return role === "admin" ? MOCK_ADMIN_USER : MOCK_STUDENT_USER;
  }

  if (path === "/api/v1/users/onboarding-complete") {
    return { success: true };
  }

  if (path === "/api/v1/users/me/progress") {
    return {
      level: "A2",
      xp: 180,
      streak_days: 4,
      completed_tasks_count: 3,
      history: [
        {
          topic_title: "Внешность и характер",
          task_title: "Задание 1. Соедините картинки со словами",
          score: 100,
          completed_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          topic_title: "Внешность и характер",
          task_title: "Задание 2. Прочитайте ситуацию и выберите правильный ответ",
          score: 100,
          completed_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    };
  }

  if (path.startsWith("/api/v1/topics")) {
    const topicIdMatch = path.match(/^\/api\/v1\/topics\/([^/?]+)/);
    if (topicIdMatch) {
      const topicId = topicIdMatch[1];
      const found = MOCK_TOPICS.find((t) => String(t.id) === String(topicId));
      return found || MOCK_TOPICS[0];
    }
    return MOCK_TOPICS;
  }

  if (path.includes("/submit")) {
    return {
      is_correct: true,
      score: 100,
      xp_awarded: 25,
      feedback: "Отличная работа! Все ответы верны.",
    };
  }

  if (path.includes("/ai-review")) {
    return {
      review:
        "Вы отлично справились! Обратите внимание на контекст употребления вопросительных слов Who (кто) и Whose (чей).",
    };
  }

  if (path === "/api/v1/homework/evaluate") {
    return {
      score: 95,
      cefr_level: "A2",
      general_feedback:
        "Прекрасное эссе! Лексика по теме «Внешность и характер» (pigtails, freckles, polite, patient) использована точно. Грамматика Present Simple соблюдена.",
      grammar_score: 94,
      vocabulary_score: 98,
      strengths: [
        "Отличное использование активного словаря темы",
        "Связный и последовательный текст с яркими жизненными примерами",
      ],
      areas_for_improvement: [
        "Обратите внимание на использование артиклей перед исчисляемыми существительными",
      ],
      suggested_revision: null,
    };
  }

  if (path === "/api/v1/onboarding/chat") {
    return { reply: ONBOARDING_GUIDE_TEXT };
  }

  if (path.startsWith("/api/v1/admin/overview")) {
    return {
      total_students: 12,
      active_today: 4,
      total_submissions: 38,
      average_score: 91.5,
    };
  }

  if (path.startsWith("/api/v1/admin/submissions")) {
    return [
      {
        id: "sub-1",
        student_id: "demo-student-uuid",
        student_username: "demo_student",
        topic_title: "Внешность и характер",
        task_title: "Задание 1. Соедините картинки со словами",
        score: 100,
        is_correct: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "sub-2",
        student_id: "demo-student-uuid",
        student_username: "demo_student",
        topic_title: "Внешность и характер",
        task_title: "Задание 2. Прочитайте ситуацию и выберите правильный ответ",
        score: 100,
        is_correct: true,
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: "sub-3",
        student_id: "demo-student-uuid",
        student_username: "demo_student",
        topic_title: "Внешность и характер",
        task_title: "Задание 4. Творческое эссе",
        score: 95,
        is_correct: true,
        created_at: new Date(Date.now() - 900000).toISOString(),
      },
    ];
  }

  if (path.startsWith("/api/v1/admin/students")) {
    return [
      {
        id: "demo-student-uuid",
        username: "demo_student",
        email: "demo@example.com",
        level: "A2",
        xp: 180,
        streak_days: 4,
        submissions_count: 3,
      },
      {
        id: "student-2",
        username: "alex_learner",
        email: "alex@example.com",
        level: "A2",
        xp: 120,
        streak_days: 2,
        submissions_count: 2,
      },
    ];
  }

  if (path.startsWith("/api/v1/admin/topics-with-tasks")) {
    return MOCK_TOPICS;
  }

  return null;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function extractErrorMessage(data, fallbackStatus) {
  if (!data) return `Request failed with status ${fallbackStatus}`;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item?.msg || JSON.stringify(item))
      .join("; ");
  }
  return `Request failed with status ${fallbackStatus}`;
}

async function request(path, options = {}) {
  const token = options.token ?? getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      const mockResult = handleMockRequest(path, options);
      if (mockResult !== null) {
        return mockResult;
      }
      const error = new Error(extractErrorMessage(data, response.status));
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (err) {
    const mockResult = handleMockRequest(path, options);
    if (mockResult !== null) {
      return mockResult;
    }
    throw err;
  }
}

export function buildTutorWebSocketUrl(userId, taskId, token) {
  const explicitWs = (import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
  let wsBase = explicitWs;
  if (!wsBase) {
    if (API_BASE) {
      wsBase = API_BASE.replace(/^http/, "ws");
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsBase = `${protocol}//${window.location.host}`;
    }
  }
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${wsBase}/ws/tutor/${userId}/${taskId}${query}`;
}

export const api = {
  login: (identifier, password) =>
    request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
      token: null,
    }),

  register: ({ username, email, password, level }) =>
    request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, level }),
      token: null,
    }),

  loginDemo: () =>
    request("/api/v1/auth/demo", {
      method: "POST",
      token: null,
    }),

  loginAdminDemo: () =>
    request("/api/v1/auth/admin-demo", {
      method: "POST",
      token: null,
    }),

  fetchMe: () => request("/api/v1/users/me"),

  updateMe: (payload) =>
    request("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  completeOnboarding: () =>
    request("/api/v1/users/onboarding-complete", {
      method: "POST",
    }),

  fetchMyProgress: () => request("/api/v1/users/me/progress"),

  fetchTopics: ({ level, allLevels = false } = {}) => {
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (allLevels) params.set("all_levels", "true");
    const qs = params.toString();
    return request(`/api/v1/topics${qs ? `?${qs}` : ""}`);
  },

  fetchTopic: (topicId) => request(`/api/v1/topics/${topicId}`),

  createTopic: (payload) =>
    request("/api/v1/topics", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateTopic: (topicId, payload) =>
    request(`/api/v1/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteTopic: (topicId) =>
    request(`/api/v1/topics/${topicId}`, {
      method: "DELETE",
    }),

  fetchTopicTasks: (topicId) => request(`/api/v1/topics/${topicId}/tasks`),

  createTopicTask: (topicId, payload) =>
    request(`/api/v1/topics/${topicId}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteTask: (taskId) =>
    request(`/api/v1/tasks/${taskId}`, {
      method: "DELETE",
    }),

  // Admin specific APIs
  fetchAdminOverview: () => request("/api/v1/admin/overview"),

  fetchAdminSubmissions: ({ studentId, topicId, limit = 100 } = {}) => {
    const params = new URLSearchParams();
    if (studentId) params.set("student_id", studentId);
    if (topicId) params.set("topic_id", topicId);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return request(`/api/v1/admin/submissions${qs ? `?${qs}` : ""}`);
  },

  fetchAdminStudents: () => request("/api/v1/admin/students"),

  fetchAdminTopicsWithTasks: () => request("/api/v1/admin/topics-with-tasks"),

  submitTask: (taskId, payload) =>
    request(`/api/v1/tasks/${taskId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  reviewTaskMistakes: (taskId, payload) =>
    request(`/api/v1/tasks/${taskId}/ai-review`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  evaluateHomework: (file, taskId = null) => {
    const formData = new FormData();
    formData.append("file", file);
    if (taskId) {
      formData.append("task_id", taskId);
    }
    return request("/api/v1/homework/evaluate", {
      method: "POST",
      body: formData,
    });
  },

  sendOnboardingMessage: (message, history = []) =>
    request("/api/v1/onboarding/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),

  streamOnboardingMessage: async (message, history = [], onChunk) => {
    try {
      const token = getStoredToken();
      const headers = new Headers({ "Content-Type": "application/json" });
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(`${API_BASE}/api/v1/onboarding/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      if (!response.body) {
        const fallback = await api.sendOnboardingMessage(message, history);
        onChunk?.(fallback.reply);
        return fallback.reply;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.chunk) {
              fullText += parsed.chunk;
              onChunk?.(fullText);
            }
          } catch {
            // Ignore malformed partial line.
          }
        }
      }
      return fullText;
    } catch {
      const fallback = await api.sendOnboardingMessage(message, history);
      onChunk?.(fallback.reply);
      return fallback.reply;
    }
  },
};
