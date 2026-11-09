import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, BookOpen, CalendarDays, ClipboardCheck, Flame, GraduationCap, Keyboard, LayoutDashboard,
  Library, Menu, Mic, Moon, NotebookPen, Settings, Sun, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { startReminderLoop } from '../lib/notify'

const NAV = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/homework', key: 'homework', icon: NotebookPen },
  { to: '/exam', key: 'exam', icon: ClipboardCheck },
  { to: '/speaking', key: 'speaking', icon: Mic },
  { to: '/vocabulary', key: 'vocabulary', icon: Library },
  { to: '/weak-spots', key: 'weak', icon: AlertTriangle },
  { to: '/typing', key: 'typing', icon: Keyboard },
  { to: '/reading', key: 'reading', icon: BookOpen },
  { to: '/planner', key: 'planner', icon: CalendarDays },
  { to: '/settings', key: 'settings', icon: Settings },
]
const MOBILE = ['/', '/homework', '/exam', '/speaking', '/vocabulary']

function NavItems({ onClick }) {
  const { t } = useApp()
  return NAV.map(({ to, key, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70'
        }`
      }
    >
      <Icon size={18} />
      {t(key)}
    </NavLink>
  ))
}

function XPWidget() {
  const { user, t } = useApp()
  if (!user) return null
  const li = user.level_info
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 p-4 text-white">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t('level')} {li.level} · {li.title}
        </span>
        <span className="flex items-center gap-1 font-bold">
          <Flame size={16} className="text-amber-300" /> {user.streak}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${(li.xp_in_level / li.xp_for_next) * 100}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-white/80">
        {li.xp_in_level} / {li.xp_for_next} XP · jami {user.xp}
      </div>
    </div>
  )
}

export default function Layout() {
  const { lang, setLang, dark, toggleTheme, user, health, t } = useApp()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const dueRef = useRef(0)

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    api.vocabStats().then((s) => (dueRef.current = s.due)).catch(() => {})
  }, [location.pathname])
  const studyTimeRef = useRef(user?.study_time)
  studyTimeRef.current = user?.notifications_enabled ? user?.study_time : null
  useEffect(() => startReminderLoop(() => studyTimeRef.current, () => dueRef.current), [])

  const sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
          <GraduationCap size={20} />
        </div>
        <div>
          <div className="font-bold leading-tight text-slate-900 dark:text-white">EduPrep AI</div>
          <div className="text-xs text-slate-500">Shaxsiy AI mentor</div>
        </div>
      </div>
      <XPWidget />
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <NavItems />
      </nav>
      <div className="flex items-center gap-2">
        <button onClick={() => setLang(lang === 'uz' ? 'en' : 'uz')} className="btn-ghost flex-1 py-2 text-xs">
          {lang === 'uz' ? "🇺🇿 O'zbekcha" : '🇬🇧 English'}
        </button>
        <button onClick={toggleTheme} className="btn-ghost px-3 py-2" aria-label="Theme">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>

      {/* Mobil yuqori panel */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:hidden">
        <button onClick={() => setOpen(true)} className="btn-ghost px-2.5 py-2" aria-label="Menu">
          <Menu size={18} />
        </button>
        <span className="font-bold">EduPrep AI</span>
        <span className="flex items-center gap-1 text-sm font-bold">
          <Flame size={16} className="text-orange-500" /> {user?.streak ?? 0}
        </span>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <button onClick={() => setOpen(false)} className="absolute right-3 top-3 p-2 text-slate-500" aria-label="Close">
                <X size={18} />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="px-4 pb-24 pt-6 lg:ml-64 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-6xl">
          {health && !health.ai_configured && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                {health.ok === false ? (
                  <>
                    <b>Backend ishlamayapti.</b> <code>backend</code> papkasida <code>uvicorn app.main:app --reload</code> ni ishga tushiring.
                  </>
                ) : (
                  <>
                    <b>AI kaliti kiritilmagan.</b> <code>backend/.env</code> faylida <code>{health.ai_provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'}</code> ni
                    to'ldiring va backendni qayta ishga tushiring. Lug'at, SRS va reja AI'siz ham ishlaydi.
                  </>
                )}
              </div>
            </div>
          )}
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </div>
      </main>

      {/* Mobil pastki navigatsiya */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        {NAV.filter((n) => MOBILE.includes(n.to)).map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`
            }
          >
            <Icon size={20} />
            <span className="truncate">{t(key).split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
