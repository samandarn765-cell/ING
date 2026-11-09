import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Flag, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBox, Markdown, PageLoading, ProgressBar, Section, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useApp, useAsync } from '../lib/app'

const SECTION_LABEL = {
  grammar: 'Grammar',
  error_spotting: 'Error Spotting',
  vocabulary: 'Vocabulary in Context',
  reading: 'Reading & Gap Filling',
}
const LETTERS = 'ABCD'

function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null')
    if (val === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(val))
  } catch {
    return null
  }
}

function Passage({ text }) {
  const parts = (text || '').split(/(\[\d+\])/g)
  return (
    <p className="whitespace-pre-line text-[15px] leading-relaxed">
      {parts.map((p, i) =>
        /^\[\d+\]$/.test(p) ? (
          <span key={i} className="mx-0.5 rounded-md bg-brand-100 px-1.5 py-0.5 text-sm font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {p} ______
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  )
}

function QuestionBody({ q }) {
  if (q.section === 'error_spotting') {
    return <p className="mb-4 text-sm text-slate-500">Quyidagi gapning qaysi qismida xato bor?</p>
  }
  return <p className="mb-4 whitespace-pre-line text-lg font-medium text-slate-900 dark:text-white">{q.question}</p>
}

function TestMode({ test, onSubmitted }) {
  const key = `mock-${test.id}`
  const saved = store(key) || {}
  const [answers, setAnswers] = useState(saved.answers || {})
  const [idx, setIdx] = useState(0)
  const [startedAt] = useState(() => saved.startedAt || Date.now())
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const q = test.questions[idx]
  const answered = Object.keys(answers).length

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    store(key, { answers, startedAt })
  }, [answers, startedAt, key])

  const elapsed = Math.floor((now - startedAt) / 1000)
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  const submit = async () => {
    const missing = test.questions.length - answered
    if (missing > 0 && !confirm(`${missing} ta savolga javob berilmagan. Baribir topshirasizmi?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.submitMock(test.id, answers, elapsed)
      store(key, null)
      onSubmitted(res)
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{SECTION_LABEL[q.section]}</div>
            <div className="text-sm text-slate-500">
              Savol {idx + 1} / {test.questions.length}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-lg font-semibold ${elapsed > 2400 ? 'text-rose-600' : ''}`}>
            <Clock size={18} /> {mm}:{ss}
          </div>
        </div>

        {q.section === 'reading' && test.reading_passage && (
          <div className="card max-h-72 overflow-y-auto bg-slate-50 dark:bg-slate-900/60">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Reading passage</div>
            <Passage text={test.reading_passage} />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="card">
            <QuestionBody q={q} />
            <div className={q.section === 'error_spotting' ? 'flex flex-wrap gap-2' : 'grid gap-2.5'}>
              {q.options.map((opt, oi) => {
                const sel = answers[q.id] === oi
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                      sel ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
                    }`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold ${sel ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                      {LETTERS[oi]}
                    </span>
                    <span className={q.section === 'error_spotting' ? 'underline decoration-dotted underline-offset-4' : ''}>{opt}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between">
          <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            <ArrowLeft size={16} /> Oldingi
          </button>
          {idx < test.questions.length - 1 ? (
            <button className="btn-primary" onClick={() => setIdx(idx + 1)}>
              Keyingi <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn-primary bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={busy}>
              {busy ? <Spinner /> : <Flag size={16} />} Topshirish
            </button>
          )}
        </div>
        <ErrorBox error={error} />
        {busy && <p className="text-center text-sm text-slate-500">Natijalar tahlil qilinmoqda (AI fikr-mulohaza yozyapti)...</p>}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">Javob berildi</span>
            <span>
              {answered}/{test.questions.length}
            </span>
          </div>
          <ProgressBar value={answered} max={test.questions.length} />
          {Object.keys(SECTION_LABEL).map((sec) => {
            const qs = test.questions.map((x, i) => [x, i]).filter(([x]) => x.section === sec)
            if (!qs.length) return null
            return (
              <div key={sec} className="mt-4">
                <div className="mb-1.5 text-xs font-semibold text-slate-500">{SECTION_LABEL[sec]}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {qs.map(([x, i]) => (
                    <button
                      key={x.id}
                      onClick={() => setIdx(i)}
                      className={`h-9 rounded-lg text-xs font-semibold transition ${
                        i === idx ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                      } ${answers[x.id] !== undefined ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      {x.id}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          <button onClick={submit} disabled={busy} className="btn-primary mt-5 w-full">
            <Flag size={16} /> Testni topshirish
          </button>
        </div>
      </aside>
    </div>
  )
}

function ResultMode({ test, onRetake, onDelete }) {
  const [onlyWrong, setOnlyWrong] = useState(true)
  const pct = test.percent
  const color = pct >= 80 ? 'text-emerald-500' : pct >= 60 ? 'text-amber-500' : 'text-rose-500'
  const r = 54
  const circ = 2 * Math.PI * r
  const questions = useMemo(
    () => test.questions.filter((q) => !onlyWrong || test.answers?.[q.id] !== q.correct_index),
    [test, onlyWrong],
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card flex flex-col items-center justify-center gap-2 py-6">
          <div className="relative h-[140px] w-[140px]">
            <svg width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r={r} strokeWidth="12" className="fill-none stroke-slate-100 dark:stroke-slate-800" />
              <motion.circle
                cx="70" cy="70" r={r} strokeWidth="12" strokeLinecap="round"
                className={`fill-none stroke-current ${color}`}
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                transition={{ duration: 1 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-3xl font-bold ${color}`}>{pct}%</div>
              <div className="text-xs text-slate-500">
                {test.score}/{test.total_questions}
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            Vaqt: {Math.floor(test.time_spent_sec / 60)} daq {test.time_spent_sec % 60} s
          </div>
        </div>
        <Section title="Bo'limlar bo'yicha" className="lg:col-span-2">
          <div className="space-y-4">
            {Object.entries(test.section_scores || {}).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{v.label}</span>
                  <span className="text-slate-500">
                    {v.correct}/{v.total}
                  </span>
                </div>
                <ProgressBar value={v.correct} max={v.total} color={v.correct / v.total >= 0.8 ? 'bg-emerald-500' : v.correct / v.total >= 0.6 ? 'bg-amber-400' : 'bg-rose-500'} />
              </div>
            ))}
          </div>
          {test.weak_topics?.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
              <AlertTriangle size={14} className="text-rose-500" /> Zaif mavzular:
              {test.weak_topics.map((t) => (
                <span key={t} className="chip bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{t}</span>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="🧑‍🏫 Ustoz AI tahlili">
          {test.ai_feedback && <Markdown>{test.ai_feedback}</Markdown>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/weak-spots" className="btn-soft">Xatolar ustida ishlash →</Link>
            <button onClick={onRetake} className="btn-ghost">
              <RotateCcw size={16} /> Qayta ishlash
            </button>
            <button onClick={onDelete} className="btn-ghost text-rose-600">
              <Trash2 size={16} /> O'chirish
            </button>
          </div>
      </Section>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Savollar tahlili</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Faqat xatolar
        </label>
      </div>

      {test.reading_passage && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">Reading passage</summary>
          <div className="mt-3">
            <Passage text={test.reading_passage} />
          </div>
        </details>
      )}

      {questions.length === 0 && <p className="card text-center text-emerald-600">Xato yo'q — barakalla! 🎉</p>}
      <div className="space-y-3">
        {questions.map((q) => {
          const chosen = test.answers?.[q.id]
          const ok = chosen === q.correct_index
          return (
            <div key={q.id} className={`card border-l-4 ${ok ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                {ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-rose-500" />}
                #{q.id} · {SECTION_LABEL[q.section]} · {q.topic}
              </div>
              <p className="mb-3 whitespace-pre-line font-medium">{q.question}</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      oi === q.correct_index
                        ? 'bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : oi === chosen
                          ? 'bg-rose-100 text-rose-800 line-through dark:bg-rose-500/15 dark:text-rose-300'
                          : 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400'
                    }`}
                  >
                    {LETTERS[oi]}) {opt}
                  </div>
                ))}
              </div>
              {chosen === undefined && <p className="mt-2 text-xs text-rose-500">Javob berilmagan</p>}
              {q.correct_version && (
                <p className="mt-3 text-sm">
                  <b className="text-emerald-600">To'g'ri gap:</b> {q.correct_version}
                </p>
              )}
              {q.explanation_uz && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">💡 {q.explanation_uz}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MockTestRunner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { gainXP } = useApp()
  const { data: test, error, loading, reload, setData } = useAsync(() => api.mockTest(id), [id])

  if (loading && !test) return <PageLoading />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  return (
    <div>
      <Link to="/exam" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Exam Center
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">{test.title}</h1>
      {test.status === 'completed' ? (
        <ResultMode
          test={test}
          onRetake={async () => navigate(`/exam/${(await api.retakeMock(test.id)).id}`)}
          onDelete={async () => {
            if (confirm("Testni o'chirasizmi?")) {
              await api.deleteMock(test.id)
              navigate('/exam')
            }
          }}
        />
      ) : (
        <TestMode
          test={test}
          onSubmitted={(res) => {
            gainXP(res.xp_earned)
            setData(res)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
    </div>
  )
}
