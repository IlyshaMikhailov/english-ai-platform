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
    const baseUser = role === "admin" ? MOCK_ADMIN_USER : MOCK_STUDENT_USER;
    if (method === "PATCH") {
      let body = {};
      try {
        body = typeof options.body === "string" ? JSON.parse(options.body) : options.body || {};
      } catch {}
      return { ...baseUser, ...body };
    }
    return baseUser;
  }

  if (path === "/api/v1/users/onboarding-complete") {
    const role = localStorage.getItem("mock_user_role");
    const currentUser = role === "admin" ? MOCK_ADMIN_USER : MOCK_STUDENT_USER;
    const updated = { ...currentUser, is_first_login: false };
    return {
      is_first_login: false,
      user: updated,
    };
  }

  if (path === "/api/v1/users/me/progress") {
    return {
      completed_tasks: 3,
      average_score: 9.7,
      records: [
        {
          id: "prog-1",
          user_id: "demo-student-uuid",
          topic_id: "1",
          task_id: "task-1",
          score: 10,
          topic_title: "Внешность и характер",
          task_type: "gamified",
          completed_at: new Date(Date.now() - 3600000).toISOString(),
          ai_feedback: {
            feedback: "Отличная работа! Все 12 слов сопоставлены верно.",
          },
        },
        {
          id: "prog-2",
          user_id: "demo-student-uuid",
          topic_id: "1",
          task_id: "task-2",
          score: 10,
          topic_title: "Внешность и характер",
          task_type: "test",
          completed_at: new Date(Date.now() - 1800000).toISOString(),
          ai_feedback: {
            feedback: "Идеально! 10 из 10 ситуаций решены верно.",
          },
        },
        {
          id: "prog-3",
          user_id: "demo-student-uuid",
          topic_id: "1",
          task_id: "task-4",
          score: 9,
          topic_title: "Внешность и характер",
          task_type: "essay",
          completed_at: new Date(Date.now() - 900000).toISOString(),
          ai_feedback: {
            feedback: "Прекрасное эссе о друге с богатой лексикой темы.",
          },
        },
      ],
    };
  }

  if (path.startsWith("/api/v1/topics")) {
    const tasksMatch = path.match(/^\/api\/v1\/topics\/([^/?]+)\/tasks/);
    if (tasksMatch) {
      const topicId = tasksMatch[1];
      const found = MOCK_TOPICS.find((t) => String(t.id) === String(topicId));
      return found ? found.tasks : [];
    }

    const topicIdMatch = path.match(/^\/api\/v1\/topics\/([^/?]+)/);
    if (topicIdMatch) {
      const topicId = topicIdMatch[1];
      const found = MOCK_TOPICS.find((t) => String(t.id) === String(topicId));
      return found || MOCK_TOPICS[0];
    }
    return MOCK_TOPICS;
  }

  if (path.includes("/submit")) {
    const taskIdMatch = path.match(/\/tasks\/([^/?]+)\/submit/);
    const taskId = taskIdMatch ? taskIdMatch[1] : "task-1";
    let body = {};
    if (typeof options.body === "string") {
      try {
        body = JSON.parse(options.body);
      } catch {}
    } else if (options.body) {
      body = options.body;
    }

    let foundTask = null;
    for (const t of MOCK_TOPICS) {
      const tk = t.tasks?.find((x) => x.id === taskId);
      if (tk) {
        foundTask = tk;
        break;
      }
    }

    if (foundTask?.content?.pairs && body.matches) {
      const pairs = foundTask.content.pairs;
      let correctCount = 0;
      const itemResults = pairs.map((p) => {
        const submitted = body.matches[p.id] || "";
        const isOk = submitted.toLowerCase() === p.word.toLowerCase();
        if (isOk) correctCount++;
        return {
          id: p.id,
          is_correct: isOk,
          submitted,
        };
      });
      const totalCount = pairs.length;
      const score = Math.round((correctCount / totalCount) * 10);
      const isCorrect = correctCount === totalCount;
      return {
        task_id: taskId,
        task_type: "gamified",
        is_correct: isCorrect,
        score,
        correct_count: correctCount,
        total_count: totalCount,
        item_results: itemResults,
        feedback: isCorrect
          ? "Отличная работа! Все слова сопоставлены верно."
          : `Вы верно сопоставили ${correctCount} из ${totalCount} слов.`,
        should_open_tutor: !isCorrect,
        wrong_summary: !isCorrect
          ? `Ошибок: ${totalCount - correctCount}`
          : null,
        progress_id: "prog-" + Date.now(),
      };
    }

    if (foundTask?.content?.questions && body.answers) {
      const questions = foundTask.content.questions;
      let correctCount = 0;
      const itemResults = questions.map((q) => {
        const submitted = body.answers[q.id] || "";
        const isOk =
          submitted.toLowerCase() === q.correct_answer.toLowerCase();
        if (isOk) correctCount++;
        return {
          id: q.id,
          is_correct: isOk,
          submitted,
          explanation: q.explanation,
        };
      });
      const totalCount = questions.length;
      const score = Math.round((correctCount / totalCount) * 10);
      const isCorrect = correctCount === totalCount;
      return {
        task_id: taskId,
        task_type: "test",
        is_correct: isCorrect,
        score,
        correct_count: correctCount,
        total_count: totalCount,
        item_results: itemResults,
        feedback: isCorrect
          ? "Превосходно! Все ответы верны."
          : `Верно ${correctCount} из ${totalCount}.`,
        should_open_tutor: !isCorrect,
        wrong_summary: !isCorrect
          ? `Ошибок: ${totalCount - correctCount}`
          : null,
        progress_id: "prog-" + Date.now(),
      };
    }

    return {
      task_id: taskId,
      task_type: foundTask?.type || "test",
      is_correct: true,
      score: 10,
      correct_count: 10,
      total_count: 10,
      item_results: [],
      feedback: "Отличная работа! Задание выполнено.",
      should_open_tutor: false,
      wrong_summary: null,
      progress_id: "prog-" + Date.now(),
    };
  }

  if (path.includes("/ai-review")) {
    return {
      analysis:
        "ИИ-разбор: Обратите внимание на ключевые контекстные признаки. Например, Who («кто») относится к одушевлённым лицам, Whose («чей») выражает принадлежность предмета человеку, а черты характера (Shy, Patient, Curious) напрямую вытекают из действий героев в описании ситуации.",
    };
  }

  if (path === "/api/v1/homework/evaluate") {
    return {
      score: 9,
      feedback:
        "Прекрасное эссе! Лексика по теме «Внешность и характер» (pigtails, freckles, patient, polite) использована точно и к месту. Грамматика Present Simple соблюдена.",
      errors: [
        {
          sentence: "He don't like waiting.",
          correction: "He doesn't like waiting.",
          explanation:
            "В Present Simple с местоимениями 3-го лица единственного числа (he/she/it) используется форма doesn't.",
        },
      ],
    };
  }

  if (path === "/api/v1/onboarding/chat") {
    return { reply: ONBOARDING_GUIDE_TEXT };
  }

  if (path.startsWith("/api/v1/admin/overview")) {
    return {
      total_students: 12,
      total_topics: MOCK_TOPICS.length,
      total_tasks: MOCK_TOPICS.reduce((acc, t) => acc + (t.tasks?.length || 0), 0),
      total_submissions: 38,
      average_score: 9.5,
    };
  }

  if (path.startsWith("/api/v1/admin/submissions")) {
    return [
      {
        id: "sub-1",
        user_id: "demo-student-uuid",
        student_name: "demo_student",
        student_email: "demo@example.com",
        student_level: "A2",
        topic_id: "1",
        topic_title: "Внешность и характер",
        topic_level: "A2",
        task_id: "task-1",
        task_type: "gamified",
        task_title: "Задание 1. Соедините картинки со словами",
        score: 10.0,
        completed_at: new Date(Date.now() - 3600000).toISOString(),
        ai_feedback: {
          feedback: "Отличная работа! Все 12 слов сопоставлены верно.",
        },
      },
      {
        id: "sub-2",
        user_id: "demo-student-uuid",
        student_name: "demo_student",
        student_email: "demo@example.com",
        student_level: "A2",
        topic_id: "1",
        topic_title: "Внешность и характер",
        topic_level: "A2",
        task_id: "task-2",
        task_type: "test",
        task_title: "Задание 2. Прочитайте ситуацию и выберите правильный ответ",
        score: 10.0,
        completed_at: new Date(Date.now() - 1800000).toISOString(),
        ai_feedback: {
          feedback: "Идеально! 10 из 10 ситуаций решены верно.",
        },
      },
      {
        id: "sub-3",
        user_id: "demo-student-uuid",
        student_name: "demo_student",
        student_email: "demo@example.com",
        student_level: "A2",
        topic_id: "1",
        topic_title: "Внешность и характер",
        topic_level: "A2",
        task_id: "task-4",
        task_type: "essay",
        task_title: "Задание 4. Творческое эссе",
        score: 9.0,
        completed_at: new Date(Date.now() - 900000).toISOString(),
        ai_feedback: {
          feedback:
            "Прекрасное эссе! Лексика по теме «Внешность и характер» использована точно.",
        },
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
        is_first_login: false,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        completed_count: 3,
        average_score: 9.7,
      },
      {
        id: "student-2",
        username: "alex_learner",
        email: "alex@example.com",
        level: "A2",
        is_first_login: false,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        completed_count: 2,
        average_score: 8.5,
      },
    ];
  }

  if (path.startsWith("/api/v1/admin/topics-with-tasks")) {
    return MOCK_TOPICS.map((t) => ({
      topic: {
        id: t.id,
        title: t.title,
        description: t.description,
        level: t.level,
        order: t.order,
        video_url: t.video_url,
        presentation_url: t.presentation_url,
        created_at: new Date().toISOString(),
      },
      tasks: t.tasks || [],
    }));
  }

  if (path === "/api/v1/topics" && method === "POST") {
    let body = {};
    try {
      body = typeof options.body === "string" ? JSON.parse(options.body) : options.body || {};
    } catch {}
    const newTopic = {
      id: "topic-" + Date.now(),
      title: body.title || "Новый модуль",
      description: body.description || "",
      level: body.level || "A2",
      order: MOCK_TOPICS.length + 1,
      video_url: body.video_url || null,
      presentation_url: body.presentation_url || null,
      tasks: [],
    };
    MOCK_TOPICS.push(newTopic);
    return newTopic;
  }

  if (path.match(/\/topics\/[^/]+\/tasks/) && method === "POST") {
    let body = {};
    try {
      body = typeof options.body === "string" ? JSON.parse(options.body) : options.body || {};
    } catch {}
    return {
      id: "task-" + Date.now(),
      topic_id: "1",
      type: body.type || "test",
      content: body.content || {},
    };
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
