import { AnimatePresence, motion } from 'framer-motion'
import { Brain, Lightbulb, Library, Plus, Search, Trash2, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AILoading, EmptyState, ErrorBox, PageHeader, PageLoading, ProgressBar } from '../components/ui'
import WordCard from '../components/WordCard'
import { api } from '../lib/api'
import { useApp, useAsync } from '../lib/app'
import { speak } from '../lib/speech'

const RATINGS = [
  { q: 1, label: 'Unutdim', sub: '1 kun', cls: 'bg-rose-500 hover:bg-rose-600' },
  { q: 3, label: 'Qiyin', sub: 'qisqa', cls: 'bg-amber-500 hover:bg-amber-600' },
  { q: 4, label: 'Yaxshi', sub: 'normal', cls: 'bg-emerald-500 hover:bg-emerald-600' },
  { q: 5, label: 'Oson', sub: 'uzoq', cls: 'bg-brand-600 hover:bg-brand-700' },
]

function Review({ onDone }) {
  const { gainXP } = useApp()
  const { data: due, loading, error, reload } = useAsync(() => api.vocabDue(), [])
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [xp, setXp] = useState(0)
  const [busy, setBusy] = useState(false)
  // Yo'nalish: EN->UZ yoki UZ->EN (faol eslash uchun aralash)
  const reverse = i % 2 === 1

  useEffect(() => {
    const onKey = (e) => {
      if (!due?.[i]) return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) rate(RATINGS[Number(e.key) - 1].q)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) return <PageLoading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!due.length || i >= due.length) {
    return (
      <EmptyState
        icon={Brain}
        title={reviewed ? `Barakalla! ${reviewed} ta so'z takrorlandi 🎉` : "Bugun takrorlanadigan so'z yo'q"}
        text={reviewed ? `+${xp} XP. SM-2 algoritmi har bir so'zni eng to'g'ri vaqtda qayta chiqaradi.` : "Yangi so'z qo'shing yoki ertaga qayting."}
        action={reviewed ? <button className="btn-soft" onClick={onDone}>Lug'atni ko'rish</button> : null}
      />
    )
  }

  const w = due[i]
  const rate = async (q) => {
    if (busy) return
    setBusy(true)
    try {
      const r = await api.reviewWord(w.id, q)
      setXp((x) => x + r.xp_earned)
      gainXP(r.xp_earned)
      setReviewed((n) => n + 1)
      setFlipped(false)
      setTimeout(() => setI((n) => n + 1), 150)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          {i + 1} / {due.length}
        </span>
        <span>{reverse ? "O'zbekcha → Inglizcha" : 'Inglizcha → O\'zbekcha'}</span>
      </div>
      <ProgressBar value={i} max={due.length} className="mb-5" />

      <div className={`flip-card cursor-pointer ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
        <div className="flip-inner relative h-80">
          <div className="flip-face card absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            {reverse ? (
              <>
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">{w.translation_uz}</div>
                <div className="text-sm text-slate-500">Inglizchasini eslang...</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{w.word}</div>
                <div className="text-sm italic text-slate-500">{w.part_of_speech}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    speak(w.word)
                  }}
                  className="btn-soft py-1.5"
                >
                  <Volume2 size={14} /> Talaffuz
                </button>
              </>
            )}
            <div className="absolute bottom-4 text-xs text-slate-400">Bosing yoki Space — javobni ko'rish</div>
          </div>
          <div className="flip-face flip-back card absolute inset-0 flex flex-col justify-center gap-2 overflow-y-auto text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{w.word}</div>
            <div className="text-lg font-semibold text-brand-700 dark:text-brand-300">{w.translation_uz}</div>
            {w.definition_en && <p className="text-sm text-slate-500">{w.definition_en}</p>}
            {w.example_sentence && <p className="text-sm italic text-slate-600 dark:text-slate-400">"{w.example_sentence}"</p>}
            {w.mnemonic && (
              <div className="mx-auto mt-1 flex max-w-md gap-2 rounded-xl bg-amber-50 p-2.5 text-left text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <Lightbulb size={14} className="mt-0.5 shrink-0" /> {w.mnemonic}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 grid grid-cols-4 gap-2">
            {RATINGS.map((r, k) => (
              <button key={r.q} disabled={busy} onClick={() => rate(r.q)} className={`rounded-xl py-3 text-white transition ${r.cls}`}>
                <div className="text-sm font-semibold">{r.label}</div>
                <div className="text-[10px] opacity-80">
                  {k + 1} · {r.sub}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AddWords({ onAdded }) {
  const { gainXP } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const saved = await api.addWords(text)
      gainXP(saved.length * 2)
      setText('')
      onAdded(saved)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  if (busy) return <AILoading text="So'zlar boyitilmoqda (tarjima, misol, mnemonika)" steps={["Tarjima qilyapman...", 'Misollar tuzyapman...', 'Qiziqarli assotsiatsiyalar o\'ylayapman...']} />
  return (
    <div className="card mx-auto max-w-xl space-y-3">
      <label className="label">Har qatorda bitta so'z yoki ibora</label>
      <textarea className="input min-h-40 font-mono text-[13px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={'reluctant\nto take for granted - oddiy hol deb bilmoq\nabundant'} />
      <ErrorBox error={error} />
      <button onClick={submit} disabled={!text.trim()} className="btn-primary w-full">
        <Plus size={16} /> AI bilan qo'shish
      </button>
    </div>
  )
}

export default function Vocabulary() {
  const [tab, setTab] = useState('review')
  const stats = useAsync(() => api.vocabStats(), [tab])
  const list = useAsync(() => (tab === 'all' ? api.vocab() : Promise.resolve(null)), [tab])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const s = stats.data
  const words = (list.data || []).filter(
    (w) => (filter === 'all' || w.mastery === filter) && (!q || `${w.word} ${w.translation_uz}`.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div>
      <PageHeader icon={Library} title="Lug'at · SRS" subtitle="SM-2 algoritmi: so'zlar 1 → 3 → 7 → 14+ kundan keyin qayta chiqadi" />

      {s && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['Jami', s.total, 'text-slate-900 dark:text-white'],
            ['Bugun', s.due, 'text-rose-600'],
            ['Yangi', s.new, 'text-slate-500'],
            ["O'rganilmoqda", s.learning + s.reviewing, 'text-amber-600'],
            ['Yodlangan', s.mastered, 'text-emerald-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="card p-4 text-center">
              <div className={`text-2xl font-bold ${c}`}>{v}</div>
              <div className="text-xs text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
        {[
          ['review', `Takrorlash${s?.due ? ` (${s.due})` : ''}`, Brain],
          ['all', "Barcha so'zlar", Library],
          ['add', "Qo'shish", Plus],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${tab === id ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300' : 'text-slate-500'}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'review' && <Review onDone={() => setTab('all')} />}
      {tab === 'add' && <AddWords onAdded={() => setTab('all')} />}
      {tab === 'all' &&
        (list.loading ? (
          <PageLoading />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish..." />
              </div>
              <select className="input sm:w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Hammasi</option>
                <option value="new">Yangi</option>
                <option value="learning">O'rganilmoqda</option>
                <option value="reviewing">Takrorlanmoqda</option>
                <option value="mastered">Yodlangan</option>
              </select>
            </div>
            {words.length === 0 ? (
              <EmptyState icon={Library} title="So'z topilmadi" text="Uy vazifasi qo'shganingizda so'zlar avtomatik shu yerga tushadi." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {words.map((w) => (
                  <div key={w.id} className="group relative">
                    <WordCard word={w} onUpdate={(u) => list.setData((ws) => ws.map((x) => (x.id === u.id ? u : x)))} />
                    <button
                      onClick={async () => {
                        if (!confirm(`"${w.word}" o'chirilsinmi?`)) return
                        await api.deleteWord(w.id)
                        list.setData((ws) => ws.filter((x) => x.id !== w.id))
                      }}
                      className="absolute right-3 top-12 hidden text-slate-300 hover:text-rose-500 group-hover:block"
                      aria-label="O'chirish"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ))}
    </div>
  )
}
