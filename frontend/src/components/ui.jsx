import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Spinner({ size = 18, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

const AI_STEPS = [
  "Mavzuni tahlil qilyapman...",
  "O'zbekcha tushuntirish yozyapman...",
  'Hayotiy misollar tanlayapman...',
  'Mashqlar tuzyapman...',
]

export function AILoading({ text, steps = AI_STEPS }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % steps.length), 2500)
    return () => clearInterval(id)
  }, [steps.length])
  return (
    <div className="card flex flex-col items-center gap-4 py-12 text-center">
      <div className="relative">
        <div className="h-14 w-14 animate-ping rounded-full bg-brand-400/30 absolute inset-0" />
        <div className="relative grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white">
          <Spinner size={26} />
        </div>
      </div>
      <p className="font-semibold">{text || "AI ishlayapti..."}</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-sm text-slate-500"
        >
          {steps[i]}
        </motion.p>
      </AnimatePresence>
      <p className="text-xs text-slate-400">Odatda 10–40 soniya davom etadi</p>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center text-slate-400">
      <Spinner size={28} />
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{error.message || String(error)}</div>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 font-semibold hover:underline">
          <RefreshCw size={14} /> Qayta
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      {Icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <Icon size={26} />
        </div>
      )}
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      {text && <p className="max-w-md text-sm text-slate-500">{text}</p>}
      {action}
    </div>
  )
}

export function ProgressBar({ value, max = 100, className = '', color = 'bg-brand-600' }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}>
      <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
    </div>
  )
}

export function Markdown({ children, className = '' }) {
  return (
    <div className={`prose-edu text-[15px] ${className}`}>
      <ReactMarkdown>{children || ''}</ReactMarkdown>
    </div>
  )
}

const TONES = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export function Badge({ tone = 'slate', children, className = '' }) {
  return <span className={`chip ${TONES[tone]} ${className}`}>{children}</span>
}

export function Section({ title, icon: Icon, children, className = '', right }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            {Icon && <Icon size={18} className="text-brand-600 dark:text-brand-400" />}
            {title}
          </h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}
