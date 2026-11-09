import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, ClipboardCheck, Clock, FileText, Lock, PlayCircle, Unlock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AILoading, Badge, ErrorBox, PageHeader, PageLoading, Section } from '../components/ui'
import { api } from '../lib/api'
import { useAsync } from '../lib/app'

const FORMAT = [
  ['Grammar', 10, 'Multiple choice + context-based'],
  ['Error Spotting', 5, 'Gapdagi xatoni topish'],
  ['Vocabulary in Context', 5, "So'zni to'g'ri qo'llash"],
  ['Reading & Gap Filling', 5, 'Matn + bo\'sh joylar + savollar'],
]

const GEN_STEPS = ['3 ta dars mavzusini yig\'yapman...', 'Grammatika savollarini tuzyapman...', 'Error spotting gaplarini yozyapman...', 'Reading matnini yaratyapman...', 'Javob kalitlarini tekshiryapman...']

export default function ExamCenter() {
  const navigate = useNavigate()
  const status = useAsync(() => api.mockStatus(), [])
  const list = useAsync(() => api.mockTests(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (status.loading && !status.data) return <PageLoading />
  if (status.error) return <ErrorBox error={status.error} onRetry={status.reload} />
  const s = status.data

  const create = async (force = false) => {
    setBusy(true)
    setError(null)
    try {
      const m = await api.createMock(force)
      navigate(`/exam/${m.id}`)
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }

  if (busy) return <AILoading text="Weekly Mock Test tayyorlanmoqda (25 savol)" steps={GEN_STEPS} />

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardCheck} title="Exam Center" subtitle="Har 3 ta uy vazifasidan so'ng — International School formatidagi 25 savollik test" />
      <ErrorBox error={error} />

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card lg:col-span-3">
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className={`grid h-24 w-24 place-items-center rounded-3xl ${s.unlocked ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
              {s.unlocked ? <Unlock size={40} /> : <Lock size={40} />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{s.unlocked ? 'WEEKLY MOCK TEST ochildi!' : 'Mock test qulflangan'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {s.unlocked ? 'Quyidagi 3 ta uy vazifasi asosida test yaratiladi.' : `Yana ${s.remaining} ta uy vazifasini kiriting — test avtomatik ochiladi.`}
              </p>
            </div>
            <div className="flex w-full max-w-sm gap-2">
              {Array.from({ length: s.homeworks_per_mock }).map((_, i) => {
                const hw = s.next_homeworks[i]
                return (
                  <div key={i} className={`flex-1 rounded-xl border-2 p-2 text-xs ${hw ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-700'}`}>
                    {hw ? (
                      <>
                        <CheckCircle2 size={16} className="mx-auto mb-1 text-brand-600" />
                        <div className="truncate font-semibold">#{hw.number}</div>
                        <div className="truncate text-slate-500">{hw.topic}</div>
                      </>
                    ) : (
                      <div className="py-3">HW {i + 1}</div>
                    )}
                  </div>
                )
              })}
            </div>
            {s.pending_test_id ? (
              <Link to={`/exam/${s.pending_test_id}`} className="btn-primary px-8 py-3">
                <PlayCircle size={18} /> Tugallanmagan testni davom ettirish
              </Link>
            ) : s.unlocked ? (
              <button onClick={() => create(false)} className="btn-primary px-8 py-3">
                <PlayCircle size={18} /> Testni yaratish va boshlash
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Link to="/homework" className="btn-primary">
                  Uy vazifasi qo'shish <ArrowRight size={16} />
                </Link>
                {s.total_homeworks > 0 && (
                  <button onClick={() => create(true)} className="text-xs font-semibold text-slate-500 hover:text-brand-600">
                    yoki hozirgi mavzular bo'yicha mashq testini ishlash →
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <Section title="Test formati" icon={FileText} className="lg:col-span-2">
          <ul className="space-y-3">
            {FORMAT.map(([name, n, desc]) => (
              <li key={name} className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{n}</div>
                <div>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Clock size={14} /> Tavsiya etilgan vaqt: 40 daqiqa. Xatolar avtomatik Weak Spots'ga tushadi.
          </div>
        </Section>
      </div>

      <Section title="Testlar tarixi" icon={ClipboardCheck}>
        {!list.data?.length ? (
          <p className="py-6 text-center text-sm text-slate-500">Hali test ishlanmagan.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.data.map((m) => (
              <Link key={m.id} to={`/exam/${m.id}`} className="flex items-center gap-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:px-2">
                <div className={`grid h-12 w-14 shrink-0 place-items-center rounded-xl text-sm font-bold ${m.status !== 'completed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : m.percent >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : m.percent >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                  {m.status === 'completed' ? `${m.percent}%` : '...'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{m.title}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(m.created_at).toLocaleDateString()} · {m.status === 'completed' ? `${m.score}/${m.total_questions}` : 'tugallanmagan'}
                  </div>
                </div>
                <Badge tone={m.status === 'completed' ? 'green' : 'amber'}>{m.status === 'completed' ? 'Tahlil' : 'Davom ettirish'}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
