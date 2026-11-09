import { motion } from 'framer-motion'
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Flame, Library, Lock, NotebookPen,
  Sparkles, Target, Trophy, Unlock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBox, PageLoading, ProgressBar, Section } from '../components/ui'
import { api } from '../lib/api'
import { useApp, useAsync } from '../lib/app'

function Stat({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="truncate text-xs text-slate-500">
          {label}
          {sub && <span className="ml-1 text-slate-400">· {sub}</span>}
        </div>
      </div>
    </div>
  )
}

function Heatmap({ days }) {
  const max = Math.max(1, ...days.map((d) => d.xp))
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const lvl = d.xp === 0 ? 0 : Math.ceil((d.xp / max) * 4)
        const cls = ['bg-slate-100 dark:bg-slate-800', 'bg-brand-200 dark:bg-brand-900', 'bg-brand-300 dark:bg-brand-700', 'bg-brand-500', 'bg-brand-700 dark:bg-brand-400'][lvl]
        return <div key={d.date} title={`${d.date}: ${d.xp} XP`} className={`aspect-square rounded-md ${cls}`} />
      })}
    </div>
  )
}

function ScoreChart({ history, target }) {
  if (!history.length) return <p className="py-6 text-center text-sm text-slate-500">Hali test topshirilmagan.</p>
  return (
    <div className="flex h-40 items-end gap-2">
      {history.map((h) => (
        <Link to={`/exam/${h.id}`} key={h.id} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{h.percent}%</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(6, h.percent)}%` }}
            className={`w-full max-w-10 rounded-t-lg ${h.percent >= target ? 'bg-emerald-500' : h.percent >= 60 ? 'bg-amber-400' : 'bg-rose-400'} group-hover:opacity-80`}
          />
          <span className="text-[10px] text-slate-400">{h.date.slice(5)}</span>
        </Link>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync(() => api.dashboard(), [])
  const { gainXP } = useApp()

  if (loading && !data) return <PageLoading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const { user, stats, mock, today, heatmap, score_history, recent_homeworks } = data

  const toggle = async (i) => {
    const r = await api.toggleTask(today.day, i)
    gainXP(r.xp_earned)
    reload()
  }
  const doneMin = today.tasks.filter((_, i) => today.completed.includes(i)).reduce((s, t) => s + (t.minutes || 0), 0)
  const totalMin = today.tasks.reduce((s, t) => s + (t.minutes || 0), 0)

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">Salom, {user.name} 👋</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {mock.unlocked ? 'Mock test tayyor — sinab ko\'ramizmi?' : `Bugun: ${today.theme || 'O\'qish kuni'}`}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Bugun {stats.today_xp} XP yig'dingiz. {stats.words_due > 0 ? `${stats.words_due} ta so'z takrorlashni kutmoqda.` : "Takrorlanadigan so'zlar yo'q — zo'r!"}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-center backdrop-blur">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                <Flame className="text-amber-300" size={22} />
                {user.streak}
              </div>
              <div className="text-xs text-white/70">kun streak</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-center backdrop-blur">
              <div className="text-2xl font-bold">{user.level_info.level}</div>
              <div className="text-xs text-white/70">{user.level_info.title}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={NotebookPen} label="Uy vazifalari" value={stats.homeworks} tone="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300" />
        <Stat icon={Library} label="So'zlar" value={stats.words_total} sub={`${stats.words_mastered} yodlangan`} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" />
        <Stat icon={Trophy} label="O'rtacha test" value={stats.avg_score != null ? `${stats.avg_score}%` : '—'} sub={`${stats.tests_taken} ta test`} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" />
        <Stat icon={AlertTriangle} label="Weak spots" value={stats.weak_spots} tone="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section
          className="lg:col-span-2"
          title={`Bugungi 2 soatlik vazifa · ${today.theme}`}
          icon={CalendarDays}
          right={<span className="text-xs text-slate-500">{doneMin}/{totalMin} daq</span>}
        >
          <ProgressBar value={doneMin} max={totalMin || 1} className="mb-4" color="bg-emerald-500" />
          <ul className="space-y-2">
            {today.tasks.map((task, i) => {
              const done = today.completed.includes(i)
              return (
                <li key={i} className={`flex items-start gap-3 rounded-xl border p-3 transition ${done ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
                  <button onClick={() => toggle(i)} className={`mt-0.5 ${done ? 'text-emerald-500' : 'text-slate-300 hover:text-brand-500'}`} aria-label="Bajarildi">
                    <CheckCircle2 size={22} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${done ? 'text-slate-400 line-through' : ''}`}>{task.title}</div>
                    <div className="text-xs text-slate-500">{task.description_uz}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs font-medium text-slate-500">{task.minutes} daq</span>
                    {task.link && (
                      <Link to={task.link} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                        Ochish →
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section title="Weekly Mock Test" icon={ClipboardCheck}>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className={`grid h-20 w-20 place-items-center rounded-full ${mock.unlocked ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
              {mock.unlocked ? <Unlock size={34} /> : <Lock size={34} />}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: mock.per }).map((_, i) => (
                <div key={i} className={`h-3 w-10 rounded-full ${i < mock.progress ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {mock.pending_test_id
                ? 'Sizda tugallanmagan test bor.'
                : mock.unlocked
                  ? "3 ta uy vazifasi tayyor — test ochildi!"
                  : `Testgacha yana ${mock.per - mock.progress} ta uy vazifasi kerak`}
            </p>
            <Link to={mock.pending_test_id ? `/exam/${mock.pending_test_id}` : '/exam'} className={mock.unlocked || mock.pending_test_id ? 'btn-primary w-full' : 'btn-ghost w-full'}>
              {mock.pending_test_id ? 'Davom ettirish' : mock.unlocked ? 'Testni boshlash' : 'Exam Center'} <ArrowRight size={16} />
            </Link>
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Test natijalari dinamikasi" icon={Target} className="lg:col-span-2" right={<span className="text-xs text-slate-500">maqsad: {user.target_score}%</span>}>
          <ScoreChart history={score_history} target={user.target_score} />
        </Section>
        <Section title="Oxirgi 4 hafta faolligi" icon={Sparkles}>
          <Heatmap days={heatmap} />
          <p className="mt-3 text-xs text-slate-500">Eng uzun streak: {user.best_streak} kun</p>
        </Section>
      </div>

      <Section title="Oxirgi uy vazifalari" icon={NotebookPen} right={<Link to="/homework" className="text-sm font-semibold text-brand-600 dark:text-brand-400">Barchasi →</Link>}>
        {recent_homeworks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-slate-500">
            Birinchi uy vazifangizni kiriting — AI uni o'zbekcha tushuntirib beradi.
            <Link to="/homework" className="btn-primary">Uy vazifasi qo'shish</Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent_homeworks.map((h) => (
              <Link key={h.id} to={`/homework/${h.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-800 dark:hover:bg-slate-800/50">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">#{h.homework_number}</div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{h.topic_name}</div>
                  <div className="text-xs text-slate-500">
                    {h.word_count} so'z · {h.drill_score != null ? `drill: ${h.drill_score}/5` : 'drill yechilmagan'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
