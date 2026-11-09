import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const DICT = {
  uz: {
    dashboard: 'Bosh sahifa', homework: 'Uy vazifalari', exam: 'Mock Test', speaking: 'Speaking Room',
    vocabulary: "Lug'at (SRS)", weak: 'Xatolar daftarchasi', planner: 'Haftalik reja', typing: 'Typing', reading: 'Reading',
    settings: 'Sozlamalar', today: 'Bugun', streak: 'kun ketma-ket', level: 'Daraja', loading: 'Yuklanmoqda...',
    aiThinking: "AI o'ylayapti...", retry: 'Qayta urinish', save: 'Saqlash', check: 'Tekshirish', next: 'Keyingi',
    back: 'Orqaga', start: 'Boshlash', practice: 'Mashq', close: 'Yopish',
  },
  en: {
    dashboard: 'Dashboard', homework: 'Homework', exam: 'Mock Test', speaking: 'Speaking Room',
    vocabulary: 'Vocabulary (SRS)', weak: 'Weak Spots', planner: 'Weekly Plan', typing: 'Typing', reading: 'Reading',
    settings: 'Settings', today: 'Today', streak: 'day streak', level: 'Level', loading: 'Loading...',
    aiThinking: 'AI is thinking...', retry: 'Retry', save: 'Save', check: 'Check', next: 'Next',
    back: 'Back', start: 'Start', practice: 'Practice', close: 'Close',
  },
}

const AppCtx = createContext(null)

function safeGet(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
function safeSet(key, val) {
  try {
    localStorage.setItem(key, val)
  } catch {
    /* private mode */
  }
}

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => safeGet('lang', 'uz'))
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [user, setUser] = useState(null)
  const [health, setHealth] = useState(null)
  const [toasts, setToasts] = useState([])

  const refreshUser = useCallback(() => api.me().then(setUser).catch(() => {}), [])

  useEffect(() => {
    refreshUser()
    api.health().then(setHealth).catch(() => setHealth({ ok: false }))
  }, [refreshUser])

  const setLang = (l) => {
    setLangState(l)
    safeSet('lang', l)
  }
  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    safeSet('theme', next ? 'dark' : 'light')
  }
  const t = (key) => DICT[lang]?.[key] ?? DICT.uz[key] ?? key

  const toast = useCallback((text, kind = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((ts) => [...ts, { id, text, kind }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3200)
  }, [])

  const gainXP = useCallback(
    (amount) => {
      if (amount > 0) {
        toast(`+${amount} XP`, 'xp')
        refreshUser()
      }
    },
    [toast, refreshUser],
  )

  return (
    <AppCtx.Provider value={{ lang, setLang, t, dark, toggleTheme, user, refreshUser, health, toast, gainXP }}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex flex-col items-end gap-2 lg:bottom-6">
        <AnimatePresence>
          {toasts.map((x) => (
            <motion.div
              key={x.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg ${
                x.kind === 'xp'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                  : x.kind === 'error'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              }`}
            >
              {x.kind === 'xp' && <Sparkles size={16} />}
              {x.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  )
}

export const useApp = () => useContext(AppCtx)

/** Oddiy data-fetch hook: { data, error, loading, reload, setData } */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    return fn()
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    run()
  }, [run])
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) }
}
