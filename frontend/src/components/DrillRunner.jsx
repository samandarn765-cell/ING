import { motion } from 'framer-motion'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ErrorBox, Spinner } from './ui'

const TYPE_LABEL = {
  mcq: 'Multiple choice',
  fill: "Bo'sh joyni to'ldiring",
  transform: "Gapni o'zgartiring",
  error: 'Xatoni toping',
  order: "So'zlarni tartiblang",
}

function OrderBuilder({ question, value, onChange, disabled }) {
  const words = useMemo(() => question.split('/').map((w) => w.trim()).filter(Boolean), [question])
  const chosen = value ? value.split('\u0001') : []
  // har bir so'z indeks bilan belgilanadi — takroriy so'zlar uchun ham to'g'ri ishlaydi
  const usedIdx = chosen.map((c) => Number(c.split('|')[0]))
  const set = (arr) => onChange(arr.join('\u0001'))
  return (
    <div className="space-y-3">
      <div className="min-h-12 rounded-xl border-2 border-dashed border-slate-200 p-2.5 dark:border-slate-700">
        {chosen.length === 0 ? (
          <span className="text-sm text-slate-400">So'zlarni bosib gap tuzing...</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {chosen.map((c, i) => (
              <button key={i} disabled={disabled} onClick={() => set(chosen.filter((_, j) => j !== i))} className="chip bg-brand-600 px-3 py-1.5 text-sm text-white">
                {c.split('|').slice(1).join('|')}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {words.map((w, i) =>
          usedIdx.includes(i) ? null : (
            <button key={i} disabled={disabled} onClick={() => set([...chosen, `${i}|${w}`])} className="chip bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-200">
              {w}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

export function orderToSentence(v) {
  return (v || '').split('\u0001').filter(Boolean).map((c) => c.split('|').slice(1).join('|')).join(' ')
}

export default function DrillRunner({ drills, onCheck, initialResult = null }) {
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(initialResult)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }))
  const answeredCount = drills.filter((d) => (answers[d.id] || '').trim()).length

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const payload = {}
      drills.forEach((d) => {
        payload[d.id] = d.type === 'order' ? orderToSentence(answers[d.id]) : answers[d.id] || ''
      })
      setResult(await onCheck(payload))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setAnswers({})
    setResult(null)
  }

  return (
    <div className="space-y-4">
      {drills.map((d, idx) => {
        const r = result?.items?.[String(d.id)]
        const locked = !!result
        return (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-2xl border p-4 ${
              r ? (r.correct ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20') : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                {idx + 1}. {TYPE_LABEL[d.type] || d.type}
              </span>
              {r && (r.correct ? <CheckCircle2 className="text-emerald-500" size={20} /> : <XCircle className="text-rose-500" size={20} />)}
            </div>
            {d.instruction_en && <p className="mb-1 text-sm text-slate-500">{d.instruction_en}</p>}
            {d.type !== 'order' && d.type !== 'error' && <p className="mb-3 font-medium">{d.question}</p>}
            {d.type === 'error' && <p className="mb-3 text-sm text-slate-500">Qaysi qismda xato bor?</p>}

            {(d.type === 'mcq' || d.type === 'error') && (
              <div className={d.type === 'error' ? 'flex flex-wrap gap-2' : 'grid gap-2 sm:grid-cols-2'}>
                {(d.options || []).map((opt, oi) => {
                  const selected = answers[d.id] === opt || (locked && r?.user_answer === opt)
                  const isCorrect = locked && r && opt.trim().toLowerCase() === (r.answer || '').trim().toLowerCase()
                  return (
                    <button
                      key={oi}
                      disabled={locked}
                      onClick={() => set(d.id, opt)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-100 dark:bg-emerald-900/40'
                          : selected
                            ? locked
                              ? 'border-rose-400 bg-rose-100 dark:bg-rose-900/40'
                              : 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-500/10'
                            : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
                      } ${d.type === 'error' ? 'font-medium underline decoration-dotted underline-offset-4' : ''}`}
                    >
                      {d.type === 'error' && <span className="mr-1 text-xs text-slate-400">{'ABCD'[oi]}</span>}
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {(d.type === 'fill' || d.type === 'transform') && (
              <input
                className="input"
                disabled={locked}
                value={locked ? r?.user_answer || '' : answers[d.id] || ''}
                onChange={(e) => set(d.id, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !locked && answeredCount === drills.length && submit()}
                placeholder="Javobingizni yozing..."
              />
            )}

            {d.type === 'order' &&
              (locked ? (
                <p className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{r?.user_answer || '—'}</p>
              ) : (
                <OrderBuilder question={d.question} value={answers[d.id]} onChange={(v) => set(d.id, v)} />
              ))}

            {r && (
              <div className="mt-3 space-y-1 rounded-xl bg-white/70 p-3 text-sm dark:bg-slate-900/60">
                {!r.correct && (
                  <p>
                    <b className="text-emerald-600 dark:text-emerald-400">To'g'ri javob:</b>{' '}
                    {d.type === 'error' ? `"${r.answer}" qismida xato. ${r.accepted_answers?.[0] ? `To'g'risi: ${r.accepted_answers[0]}` : ''}` : r.answer}
                  </p>
                )}
                {r.explanation_uz && <p className="text-slate-600 dark:text-slate-300">💡 {r.explanation_uz}</p>}
              </div>
            )}
          </motion.div>
        )
      })}

      <ErrorBox error={error} />

      {result ? (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800 sm:flex-row">
          <div className="font-semibold">
            Natija: {result.score} / {result.total} {result.score === result.total ? '🎉' : result.score >= result.total / 2 ? '👍' : '💪'}
            {result.xp_earned > 0 && <span className="ml-2 text-sm text-amber-600">+{result.xp_earned} XP</span>}
          </div>
          <button onClick={reset} className="btn-ghost">
            <RotateCcw size={16} /> Qayta yechish
          </button>
        </div>
      ) : (
        <button onClick={submit} disabled={busy || answeredCount === 0} className="btn-primary w-full py-3">
          {busy && <Spinner />} Tekshirish ({answeredCount}/{drills.length})
        </button>
      )}
    </div>
  )
}
