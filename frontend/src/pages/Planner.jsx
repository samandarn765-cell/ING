import { motion } from 'framer-motion'
import { Bell, CalendarDays, CheckCircle2, Clock, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AILoading, ErrorBox, PageHeader, PageLoading, ProgressBar } from '../components/ui'
import { api } from '../lib/api'
import { useApp, useAsync } from '../lib/app'

const DAY_UZ = {
  monday: 'Dushanba', tuesday: 'Seshanba', wednesday: 'Chorshanba', thursday: 'Payshanba',
  friday: 'Juma', saturday: 'Shanba', sunday: 'Yakshanba',
}

export default function Planner() {
  const { gainXP, user } = useApp()
  const { data, error, loading, reload, setData } = useAsync(() => api.week(), [])
  const [busy, setBusy] = useState(false)
  const [genError, setGenError] = useState(null)
  const [selected, setSelected] = useState(null)

  if (busy) return <AILoading text="AI Study Agent haftalik reja tuzmoqda" steps={['Xatolaringizni tahlil qilyapman...', "So'zlar SRS jadvalini ko'ryapman...", '2 soatlik bloklarni taqsimlayapman...']} />
  if (loading && !data) return <PageLoading />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  const day = selected || data.today
  const dayPlan = data.plan.days[day] || { tasks: [] }
  const done = data.completed[day] || []

  const generate = async () => {
    setBusy(true)
    setGenError(null)
    try {
      setData(await api.generatePlan())
    } catch (e) {
      setGenError(e)
    } finally {
      setBusy(false)
    }
  }
  const toggle = async (i) => {
    const r = await api.toggleTask(day, i)
    gainXP(r.xp_earned)
    setData(r)
  }

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="AI Study Agent · Haftalik reja"
        subtitle={`Har kuni 2 soat · boshlanish ${user?.study_time || '19:00'}`}
        actions={
          <>
            <button onClick={async () => setData(await api.resetPlan())} className="btn-ghost" title="Standart reja">
              <RotateCcw size={16} />
            </button>
            <button onClick={generate} className="btn-primary">
              <Sparkles size={16} /> AI bilan shaxsiylashtirish
            </button>
          </>
        }
      />
      <ErrorBox error={genError} />
      {data.plan.motivation_uz && (
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 p-4 text-sm font-medium text-white">
          {data.plan.source === 'ai' ? '🤖 ' : '💡 '}
          {data.plan.motivation_uz}
        </div>
      )}

      <div className="mb-6 grid grid-cols-7 gap-1.5 sm:gap-2">
        {data.days_order.map((d) => {
          const p = data.plan.days[d] || { tasks: [] }
          const total = p.tasks.length
          const c = (data.completed[d] || []).length
          const active = d === day
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`rounded-2xl border p-2 text-center transition sm:p-3 ${
                active ? 'border-brand-500 bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase opacity-80 sm:text-xs">{DAY_UZ[d].slice(0, 3)}</div>
              <div className="mt-1 hidden truncate text-xs sm:block">{(p.theme || '').replace(/^[^\w]+/, '').split(' ')[0]}</div>
              <div className={`mx-auto mt-2 h-1.5 w-full overflow-hidden rounded-full ${active ? 'bg-white/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <div className={`h-full ${active ? 'bg-white' : 'bg-emerald-500'}`} style={{ width: `${total ? (c / total) * 100 : 0}%` }} />
              </div>
              {d === data.today && <div className={`mt-1 text-[9px] font-bold ${active ? '' : 'text-brand-600'}`}>BUGUN</div>}
            </button>
          )
        })}
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm text-slate-500">{DAY_UZ[day]}</div>
            <h2 className="text-xl font-bold">{dayPlan.theme}</h2>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={16} /> {dayPlan.tasks.reduce((s, t) => s + (t.minutes || 0), 0)} daqiqa
          </div>
        </div>
        <ProgressBar value={done.length} max={dayPlan.tasks.length || 1} className="mb-5" color="bg-emerald-500" />

        <ol className="relative space-y-3 border-l-2 border-slate-100 pl-6 dark:border-slate-800">
          {dayPlan.tasks.map((t, i) => {
            const isDone = done.includes(i)
            return (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                <button
                  onClick={() => toggle(i)}
                  className={`absolute -left-[35px] top-3 grid h-6 w-6 place-items-center rounded-full border-2 bg-white transition dark:bg-slate-900 ${isDone ? 'border-emerald-500 text-emerald-500' : 'border-slate-300 text-transparent hover:border-brand-500'}`}
                  aria-label="Bajarildi"
                >
                  <CheckCircle2 size={14} />
                </button>
                <div className={`rounded-xl border p-4 ${isDone ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`font-semibold ${isDone ? 'text-slate-400 line-through' : ''}`}>{t.title}</div>
                      <p className="mt-0.5 text-sm text-slate-500">{t.description_uz}</p>
                    </div>
                    <span className="chip shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t.minutes} daq</span>
                  </div>
                  {t.link && (
                    <Link to={t.link} className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
                      Boshlash →
                    </Link>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ol>
      </div>

      <Link to="/settings" className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-400">
        <Bell size={18} className="text-brand-600" />
        Eslatmalarni sozlash: brauzer bildirishnomasi va Telegram bot →
      </Link>
    </div>
  )
}
