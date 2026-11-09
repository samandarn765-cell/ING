import {
  AlertOctagon, ArrowLeft, BookOpenCheck, Dumbbell, GraduationCap, Lightbulb, Library, MessageCircleQuestion,
  RefreshCw, Send, Target, Trash2, Volume2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DrillRunner from '../components/DrillRunner'
import { AILoading, ErrorBox, Markdown, PageLoading, Section, Spinner } from '../components/ui'
import WordCard from '../components/WordCard'
import { api } from '../lib/api'
import { useApp, useAsync } from '../lib/app'
import { speak } from '../lib/speech'

const TABS = [
  { id: 'explain', label: 'Tushuntirish', icon: GraduationCap },
  { id: 'drills', label: 'Mashqlar', icon: Dumbbell },
  { id: 'words', label: "So'zlar", icon: Library },
  { id: 'ask', label: 'Savol berish', icon: MessageCircleQuestion },
]

function Explanation({ ex }) {
  return (
    <div className="space-y-5">
      <Section title="Sodda tushuntirish" icon={GraduationCap}>
        <Markdown>{ex.simple_explanation_uz}</Markdown>
      </Section>

      {ex.analogy_uz && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-500/5">
          <Lightbulb className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <div className="mb-1 font-semibold text-amber-900 dark:text-amber-200">Hayotiy analogiya</div>
            <Markdown className="text-amber-900/90 dark:text-amber-100/90">{ex.analogy_uz}</Markdown>
          </div>
        </div>
      )}

      {ex.formulas?.length > 0 && (
        <Section title="Formula" icon={Target}>
          <div className="grid gap-2 sm:grid-cols-3">
            {ex.formulas.map((f, i) => (
              <div key={i} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                <div className="text-xs font-semibold text-slate-500">{f.label}</div>
                <div className="mt-1 font-mono text-sm font-semibold text-brand-700 dark:text-brand-300">{f.pattern}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {ex.comparison_uz && (
        <Section title="Taqqoslash" icon={BookOpenCheck}>
          <Markdown>{ex.comparison_uz}</Markdown>
        </Section>
      )}

      {ex.examples?.length > 0 && (
        <Section title="Misollar" icon={BookOpenCheck}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {ex.examples.map((e, i) => (
              <li key={i} className="py-3">
                <div className="flex items-start gap-2">
                  <button onClick={() => speak(e.en)} className="mt-0.5 text-slate-400 hover:text-brand-600" aria-label="Tinglash">
                    <Volume2 size={16} />
                  </button>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{e.en}</p>
                    <p className="text-sm text-slate-500">{e.uz}</p>
                    {e.note_uz && <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">→ {e.note_uz}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {ex.when_to_use_uz?.length > 0 && (
          <Section title="Qachon ishlatiladi?" icon={Target}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {ex.when_to_use_uz.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </Section>
        )}
        {ex.common_mistakes?.length > 0 && (
          <Section title="Ko'p uchraydigan xatolar" icon={AlertOctagon}>
            <ul className="space-y-3 text-sm">
              {ex.common_mistakes.map((m, i) => (
                <li key={i}>
                  <div className="text-rose-600 line-through dark:text-rose-400">✗ {m.wrong}</div>
                  <div className="font-medium text-emerald-700 dark:text-emerald-400">✓ {m.right}</div>
                  <div className="text-xs text-slate-500">{m.why_uz}</div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {ex.answers_to_questions?.length > 0 && (
        <Section title="Savollaringizga javoblar" icon={MessageCircleQuestion}>
          <div className="space-y-4">
            {ex.answers_to_questions.map((q, i) => (
              <div key={i}>
                <p className="font-semibold text-slate-900 dark:text-white">❓ {q.question}</p>
                <Markdown className="mt-1 text-slate-700 dark:text-slate-300">{q.answer_uz}</Markdown>
              </div>
            ))}
          </div>
        </Section>
      )}

      {ex.exam_tips_uz?.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 p-5 text-white">
          <div className="mb-2 font-semibold">🎯 Imtihon maslahatlari</div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/90">
            {ex.exam_tips_uz.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function AskTab({ hwId }) {
  const { data: history, setData } = useAsync(() => api.homeworkChat(hwId), [hwId])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [history, busy])

  const send = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    const question = q
    setQ('')
    setBusy(true)
    setError(null)
    setData((h) => [...(h || []), { role: 'user', content: question }])
    try {
      const { answer } = await api.askHomework(hwId, question)
      setData((h) => [...h, { role: 'assistant', content: answer }])
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card flex h-[60vh] flex-col p-0">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {(history || []).length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">Mavzu bo'yicha har qanday savolingizni bering — AI o'zbekcha javob beradi.</p>
        )}
        {(history || []).map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {m.role === 'user' ? m.content : <Markdown>{m.content}</Markdown>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size={14} /> Ustoz AI yozmoqda...
          </div>
        )}
        <div ref={endRef} />
      </div>
      <ErrorBox error={error} />
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Masalan: 'already' qayerga qo'yiladi?" />
        <button className="btn-primary" disabled={busy || !q.trim()} aria-label="Yuborish">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

export default function HomeworkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { gainXP } = useApp()
  const { data: hw, error, loading, reload, setData } = useAsync(() => api.homework(id), [id])
  const [tab, setTab] = useState('explain')
  const [regen, setRegen] = useState(false)
  const [regenError, setRegenError] = useState(null)

  if (loading && !hw) return <PageLoading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (regen) return <AILoading text="Tushuntirish qayta yaratilmoqda" />

  const regenerate = async () => {
    setRegen(true)
    setRegenError(null)
    try {
      setData(await api.regenerateHomework(id))
    } catch (e) {
      setRegenError(e)
    } finally {
      setRegen(false)
    }
  }
  const remove = async () => {
    if (!confirm("Bu uy vazifasini o'chirasizmi? (So'zlar lug'atda qoladi)")) return
    await api.deleteHomework(id)
    navigate('/homework')
  }

  return (
    <div>
      <Link to="/homework" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Uy vazifalari
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-brand-600 dark:text-brand-400">Homework #{hw.homework_number}</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{hw.explanation?.title || hw.topic_name}</h1>
          {hw.grammar_points && <p className="mt-1 text-sm text-slate-500">{hw.grammar_points}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={regenerate} className="btn-ghost" title="AI bilan qayta yaratish">
            <RefreshCw size={16} /> Qayta yaratish
          </button>
          <button onClick={remove} className="btn-ghost text-rose-600" aria-label="O'chirish">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <ErrorBox error={regenError} />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'explain' &&
        (hw.explanation ? (
          <Explanation ex={hw.explanation} />
        ) : (
          <div className="card text-center">
            <p className="mb-3 text-slate-500">AI tushuntirish hali yaratilmagan (ehtimol AI kaliti yo'q edi).</p>
            <button onClick={regenerate} className="btn-primary">
              <RefreshCw size={16} /> Hozir yaratish
            </button>
          </div>
        ))}

      {tab === 'drills' &&
        (hw.drills?.length ? (
          <DrillRunner
            key={hw.id + (hw.drills?.[0]?.question || '')}
            drills={hw.drills}
            onCheck={async (answers) => {
              const r = await api.checkDrills(hw.id, answers)
              gainXP(r.xp_earned)
              return r
            }}
          />
        ) : (
          <p className="card text-center text-slate-500">Mashqlar yo'q. "Qayta yaratish" tugmasini bosing.</p>
        ))}

      {tab === 'words' &&
        (hw.words?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {hw.words.map((w) => (
              <WordCard key={w.id} word={w} onUpdate={(u) => setData((h) => ({ ...h, words: h.words.map((x) => (x.id === u.id ? u : x)) }))} />
            ))}
          </div>
        ) : (
          <p className="card text-center text-slate-500">Bu uy vazifasida yangi so'zlar kiritilmagan.</p>
        ))}

      {tab === 'ask' && <AskTab hwId={hw.id} />}
    </div>
  )
}
