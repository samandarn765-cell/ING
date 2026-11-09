import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, HelpCircle, Languages, NotebookPen, Plus, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AILoading, Badge, EmptyState, ErrorBox, PageHeader, PageLoading } from '../components/ui'
import { api } from '../lib/api'
import { useApp, useAsync } from '../lib/app'

const EXAMPLE = {
  topic_name: 'Past Perfect vs Past Simple',
  grammar_points: 'had + V3; by the time, before, after, already; ketma-ketlik',
  vocabulary_raw: 'reluctant - istamaydigan\nto take for granted\nabundant\noverwhelmed - juda charchagan/esankiragan',
  questions: "Qachon Past Simple, qachon Past Perfect ishlatiladi? 'By the time' dan keyin qaysi zamon keladi?",
}

function HomeworkForm({ onClose, nextNumber }) {
  const navigate = useNavigate()
  const { gainXP, toast } = useApp()
  const [form, setForm] = useState({ topic_name: '', grammar_points: '', vocabulary_raw: '', questions: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const hw = await api.createHomework(form)
      gainXP(hw.xp_earned)
      if (hw.ai_error) toast(`Saqlandi, lekin AI xatosi: ${hw.ai_error}`, 'error')
      navigate(`/homework/${hw.id}`)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  if (busy) return <AILoading text={`Uy vazifasi #${nextNumber} tahlil qilinmoqda`} />

  return (
    <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={submit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Yangi uy vazifasi #{nextNumber}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => setForm(EXAMPLE)} className="btn-soft py-1.5 text-xs">
            <Sparkles size={14} /> Namuna
          </button>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
      </div>
      <div>
        <label className="label">O'tilgan mavzu *</label>
        <input className="input" required minLength={2} value={form.topic_name} onChange={set('topic_name')} placeholder="Masalan: Third Conditional" />
      </div>
      <div>
        <label className="label">Grammatik qoidalar / darsdagi eslatmalar</label>
        <textarea className="input min-h-20" value={form.grammar_points} onChange={set('grammar_points')} placeholder="If + had + V3, would have + V3 ..." />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1.5">
            <Languages size={15} /> Yangi so'zlar (har qatorda bitta)
          </label>
          <textarea className="input min-h-32 font-mono text-[13px]" value={form.vocabulary_raw} onChange={set('vocabulary_raw')} placeholder={'reluctant - istamaydigan\nabundant\nto give up'} />
          <p className="mt-1 text-xs text-slate-500">Tarjima ixtiyoriy — AI o'zi to'ldiradi va mnemonika qo'shadi.</p>
        </div>
        <div>
          <label className="label flex items-center gap-1.5">
            <HelpCircle size={15} /> Tushunmagan savollarim
          </label>
          <textarea className="input min-h-32" value={form.questions} onChange={set('questions')} placeholder="Nega bu yerda 'had' ishlatiladi?..." />
        </div>
      </div>
      <ErrorBox error={error} />
      <button type="submit" className="btn-primary w-full py-3">
        <Sparkles size={16} /> AI bilan tushuntirish va mashqlar yaratish
      </button>
    </motion.form>
  )
}

export default function HomeworkList() {
  const { data, error, loading, reload } = useAsync(() => api.homeworks(), [])
  const [showForm, setShowForm] = useState(false)

  if (loading && !data) return <PageLoading />
  const hws = data || []
  const next = hws.length ? Math.max(...hws.map((h) => h.homework_number)) + 1 : 1

  return (
    <div>
      <PageHeader
        icon={NotebookPen}
        title="Smart Homework Explainer"
        subtitle="Mavzu, so'zlar va savollaringizni kiriting — AI o'zbekcha tushuntiradi va 5 ta mashq tuzadi"
        actions={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} /> Uy vazifasi qo'shish
            </button>
          )
        }
      />
      <ErrorBox error={error} onRetry={reload} />
      <AnimatePresence>{showForm && <div className="mb-6"><HomeworkForm nextNumber={next} onClose={() => setShowForm(false)} /></div>}</AnimatePresence>

      {hws.length === 0 && !showForm ? (
        <EmptyState
          icon={NotebookPen}
          title="Hali uy vazifasi yo'q"
          text="Har bir darsdan keyin mavzuni kiriting. 3 ta uy vazifasidan so'ng Weekly Mock Test avtomatik ochiladi."
          action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Birinchisini qo'shish</button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {hws.map((h, i) => (
            <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/homework/${h.id}`} className="card group flex items-center gap-4 p-4 transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-bold text-white">
                  {h.homework_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-900 dark:text-white">{h.topic_name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone="brand">{h.word_count} so'z</Badge>
                    {h.drill_score != null ? (
                      <Badge tone={h.drill_score >= 4 ? 'green' : 'amber'}>Drill {h.drill_score}/5</Badge>
                    ) : (
                      <Badge>Drill yechilmagan</Badge>
                    )}
                    {h.mock_test_id && <Badge tone="green">Testda</Badge>}
                    {!h.has_explanation && <Badge tone="red">AI tushuntirish yo'q</Badge>}
                  </div>
                </div>
                <ChevronRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-500" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
