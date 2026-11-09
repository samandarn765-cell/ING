// Backend bilan ishlash uchun yagona joy. Lokal muhitda Vite proxy (/api), prod'da Render backend ishlatiladi.
const DEFAULT_PROD_API = 'https://ing-backend.onrender.com/api'
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_API : '/api')
).replace(/\/$/, '')

async function request(path, { method = 'GET', body } = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const res = await fetch(`${API_BASE}${normalizedPath}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* bo'sh javob */
  }
  if (!res.ok) {
    let msg = data?.detail
    if (Array.isArray(msg)) msg = msg.map((d) => d.msg).join('; ')
    if (!msg && res.status >= 500) msg = "Server bilan bog'lanib bo'lmadi. Backend ishga tushirilganini tekshiring (uvicorn)."
    throw new Error(msg || `Xato: ${res.status}`)
  }
  return data
}

export const api = {
  health: () => request('/health'),
  me: () => request('/me'),
  dashboard: () => request('/dashboard'),
  updateSettings: (body) => request('/settings', { method: 'PUT', body }),

  // Homework
  homeworks: () => request('/homeworks'),
  homework: (id) => request(`/homeworks/${id}`),
  createHomework: (body) => request('/homeworks', { method: 'POST', body }),
  regenerateHomework: (id) => request(`/homeworks/${id}/regenerate`, { method: 'POST' }),
  deleteHomework: (id) => request(`/homeworks/${id}`, { method: 'DELETE' }),
  checkDrills: (id, answers) => request(`/homeworks/${id}/drills/check`, { method: 'POST', body: { answers } }),
  askHomework: (id, question) => request(`/homeworks/${id}/ask`, { method: 'POST', body: { question } }),
  homeworkChat: (id) => request(`/homeworks/${id}/chat`),

  // Mock test
  mockStatus: () => request('/mock-tests/status'),
  mockTests: () => request('/mock-tests'),
  mockTest: (id) => request(`/mock-tests/${id}`),
  createMock: (force = false) => request(`/mock-tests?force=${force}`, { method: 'POST' }),
  submitMock: (id, answers, time_spent_sec) => request(`/mock-tests/${id}/submit`, { method: 'POST', body: { answers, time_spent_sec } }),
  retakeMock: (id) => request(`/mock-tests/${id}/retake`, { method: 'POST' }),
  deleteMock: (id) => request(`/mock-tests/${id}`, { method: 'DELETE' }),

  // Speaking
  speakingTopics: () => request('/speaking/topics'),
  startSpeaking: (topic) => request('/speaking/sessions', { method: 'POST', body: { topic } }),
  sendSpeaking: (sid, text) => request(`/speaking/sessions/${sid}/message`, { method: 'POST', body: { text } }),
  speakingSessions: () => request('/speaking/sessions'),
  speakingSession: (sid) => request(`/speaking/sessions/${sid}`),

  // Vocabulary
  vocab: () => request('/vocab'),
  vocabDue: () => request('/vocab/due'),
  vocabStats: () => request('/vocab/stats'),
  addWords: (words) => request('/vocab', { method: 'POST', body: { words } }),
  reviewWord: (id, quality) => request(`/vocab/${id}/review`, { method: 'POST', body: { quality } }),
  updateWord: (id, body) => request(`/vocab/${id}`, { method: 'PATCH', body }),
  mnemonics: (id) => request(`/vocab/${id}/mnemonics`, { method: 'POST' }),
  deleteWord: (id) => request(`/vocab/${id}`, { method: 'DELETE' }),

  // Weak spots
  weakSpots: (includeResolved = false) => request(`/weak-spots?include_resolved=${includeResolved}`),
  resolveSpot: (id) => request(`/weak-spots/${id}/resolve`, { method: 'POST' }),
  deleteSpot: (id) => request(`/weak-spots/${id}`, { method: 'DELETE' }),
  repairLesson: () => request('/weak-spots/review', { method: 'POST' }),
  checkRepair: (pid, answers) => request(`/weak-spots/review/${pid}/check`, { method: 'POST', body: { answers } }),

  // Planner
  week: () => request('/planner/week'),
  generatePlan: () => request('/planner/generate', { method: 'POST' }),
  resetPlan: () => request('/planner/reset', { method: 'POST' }),
  toggleTask: (day, task_index) => request('/planner/toggle', { method: 'POST', body: { day, task_index } }),
  testTelegram: () => request('/planner/notify/test', { method: 'POST' }),
  linkTelegram: () => request('/planner/notify/link-telegram', { method: 'POST' }),

  // Practice
  typingSet: (count = 10) => request(`/practice/typing?count=${count}`, { method: 'POST' }),
  readingSet: () => request('/practice/reading', { method: 'POST' }),
  submitReading: (pid, answers) => request(`/practice/reading/${pid}/submit`, { method: 'POST', body: { answers } }),
  practiceResult: (body) => request('/practice/result', { method: 'POST', body }),
}
