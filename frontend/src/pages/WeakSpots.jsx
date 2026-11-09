import { AlertTriangle, CheckCircle2, ClipboardCheck, Dumbbell, Mic, NotebookPen, BookOpen, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import DrillRunner from '../components/DrillRunner'
import { AILoading, Badge, EmptyState, ErrorBox, PageHeader, PageLoading, Section } from '../components/ui'
import { api } from '../lib/api'
import { useApp, useAsync } from '../lib/app'

const SOURCE = {
  mock_test: ['Mock test', ClipboardCheck, 'brand'],
  drill: ['Drill', Dumbbell, 'amber'],
  speaking: ['Speaking', Mic, 'green'],
  reading: ['Reading', BookOpen, 'slate'],
}

function RepairLesson({ data, onClose }) {
  const { gainXP } = useApp()
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 p-5 text-white">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <Wand2 size={18} /> AI Repair Lesson
        </div>
        <p className="text-sm text-white/90">{data.summary_uz}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.patterns.map((p, i) => (
          <div key={i} className="card">
            <div className="mb-1 font-semibold text-slate-900 dark:text-white">{p.topic}</div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{p.explanation_uz}</p>
            {p.example_en && <p className="mt-2 border-l-2 border-emerald-400 pl-3 text-sm italic">{p.example_en}</p>}
            {p.tip_uz && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">💡 {p.tip_uz}</p>}
          </div>
        ))}
      </div>
      <Section title="Mustahkamlash mashqlari" icon={Dumbbell}>
        <DrillRunner
          drills={data.drills}
          onCheck={async (answers) => {
            const r = await api.checkRepair(data.practice_id, answers)
            gainXP(r.xp_earned)
            return r
          }}
        />
      </Section>
      <button onClick={onClose} className="btn-ghost w-full">
        Xatolar ro'yxatiga qaytish
      </button>
    </div>
  )
}

export default function WeakSpots() {
  const { gainXP } = useApp()
  const [showResolved, setShowResolved] = useState(false)
  const [repair, setRepair] = useState(null) // null | 'loading' | lesson data
  const [repairError, setRepairError] = useState(null)
  const { data, error, loading, reload, setData } = useAsync(() => api.weakSpots(showResolved), [showResolved])

  const startRepair = async () => {
    setRepair('loading')
    setRepairError(null)
    try {
      setRepair(await api.repairLesson())
    } catch (e) {
      setRepairError(e)
      setRepair(null)
    }
  }

  const grouped = useMemo(() => {
    const g = {}
    for (const w of data || []) (g[w.topic] ||= []).push(w)
    return Object.entries(g).sort((a, b) => b[1].reduce((s, x) => s + x.times_wrong, 0) - a[1].reduce((s, x) => s + x.times_wrong, 0))
  }, [data])

  if (repair === 'loading') {
    return <AILoading text="Xatolaringiz tahlil qilinmoqda" steps={['Xatolardagi qonuniyatlarni topyapman...', 'Qoidalarni sodda tushuntiryapman...', 'Maxsus mashqlar tuzyapman...']} />
  }
  if (repair) {
    return (
      <div>
        <PageHeader icon={Sparkles} title="AI Repair Lesson" subtitle="Xatolaringiz asosida maxsus dars" />
        <RepairLesson
          data={repair}
          onClose={() => {
            setRepair(null)
            reload()
          }}
        />
      </div>
    )
  }

  const resolve = async (id) => {
    await api.resolveSpot(id)
    gainXP(8)
    setData((ws) => (showResolved ? ws.map((w) => (w.id === id ? { ...w, resolved: true } : w)) : ws.filter((w) => w.id !== id)))
  }
  const remove = async (id) => {
    await api.deleteSpot(id)
    setData((ws) => ws.filter((w) => w.id !== id))
  }

  return (
    <div>
      <PageHeader
        icon={AlertTriangle}
        title="Weak Spots · Xatolar daftarchasi"
        subtitle="Testlar, drill'lar va suhbatdagi har bir xato shu yerda — ularni yengib o'ting"
        actions={
          <>
            <label className="flex items-center gap-2 px-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
              Hal qilinganlar
            </label>
            <button onClick={startRepair} disabled={!data?.length} className="btn-primary">
              <Wand2 size={16} /> AI Repair Lesson
            </button>
          </>
        }
      />
      <ErrorBox error={error || repairError} onRetry={reload} />
      {loading && !data ? (
        <PageLoading />
      ) : !data?.length ? (
        <EmptyState icon={CheckCircle2} title="Xatolar yo'q 🎉" text="Mock test, drill yoki speaking'da xato qilsangiz, ular avtomatik shu yerga tushadi." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([topic, items]) => (
            <Section key={topic} title={topic} icon={NotebookPen} right={<Badge tone="red">{items.length} ta</Badge>}>
              <div className="space-y-3">
                {items.map((w) => {
                  const [label, Icon, tone] = SOURCE[w.source] || [w.source, AlertTriangle, 'slate']
                  return (
                    <div key={w.id} className={`rounded-xl border p-4 ${w.resolved ? 'border-emerald-200 opacity-60 dark:border-emerald-900' : 'border-slate-200 dark:border-slate-800'}`}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={tone}>
                          <Icon size={12} /> {label}
                        </Badge>
                        {w.times_wrong > 1 && <Badge tone="red">{w.times_wrong}× xato</Badge>}
                        <span className="text-xs text-slate-400">{new Date(w.created_at).toLocaleDateString()}</span>
                        <div className="ml-auto flex gap-1">
                          {!w.resolved && (
                            <button onClick={() => resolve(w.id)} className="chip bg-emerald-50 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300">
                              <CheckCircle2 size={13} /> Tushundim
                            </button>
                          )}
                          <button onClick={() => remove(w.id)} className="p-1 text-slate-300 hover:text-rose-500" aria-label="O'chirish">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="whitespace-pre-line font-medium">{w.question}</p>
                      <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                        <div className="text-rose-600 dark:text-rose-400">✗ {w.user_answer || '—'}</div>
                        <div className="font-medium text-emerald-700 dark:text-emerald-400">✓ {w.correct_answer}</div>
                      </div>
                      {w.explanation && <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">💡 {w.explanation}</p>}
                    </div>
                  )
                })}
              </div>
            </Section>
          ))}
        </div>
      )}
    </div>
  )
}
