import { BookOpen, CheckCircle2, Pause, PlayCircle, RotateCcw, Volume2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AILoading, ErrorBox, PageHeader, Section, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { speak, stopSpeaking } from '../lib/speech'

export default function Reading() {
  const { gainXP } = useApp()
  const [set, setSet] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [hideText, setHideText] = useState(false)

  useEffect(() => () => stopSpeaking(), [])

  const load = async () => {
    setBusy(true)
    setError(null)
    try {
      setSet(await api.readingSet())
      setAnswers({})
      setResult(null)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const listen = () => {
    if (playing) {
      stopSpeaking()
      setPlaying(false)
      return
    }
    setPlaying(true)
    speak(set.text, { rate: 0.9, onEnd: () => setPlaying(false) })
  }

  const submit = async () => {
    setBusy(true)
    try {
      const r = await api.submitReading(set.practice_id, answers)
      setResult(r)
      gainXP(r.xp_earned)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  if (busy && !set) return <AILoading text="Siz uchun matn yozilmoqda" steps={['Mavzularingizni tanlayapman...', 'Qiziqarli matn yozyapman...', 'Savollar tuzyapman...']} />

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Reading & Listening"
        subtitle="Chorshanba mashqi: o'z mavzularingiz va so'zlaringiz asosidagi matn"
        actions={
          set && (
            <button onClick={load} className="btn-ghost">
              <RotateCcw size={16} /> Yangi matn
            </button>
          )
        }
      />
      <ErrorBox error={error} />

      {!set ? (
        <div className="card mx-auto max-w-lg space-y-4 text-center">
          <BookOpen size={40} className="mx-auto text-brand-600" />
          <p className="text-slate-600 dark:text-slate-400">
            AI oxirgi darslaringiz grammatikasi va so'zlari asosida 200–280 so'zlik matn yozadi. Avval <b>tinglang</b> (matnni yashirib), keyin o'qing va 6 ta savolga javob bering.
          </p>
          <button onClick={load} className="btn-primary w-full py-3">
            <PlayCircle size={18} /> Matn yaratish
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title={set.title}
            icon={BookOpen}
            right={
              <div className="flex gap-2">
                <button onClick={() => setHideText(!hideText)} className="btn-ghost px-3 py-1.5 text-xs">
                  {hideText ? "Matnni ko'rsatish" : 'Yashirish (listening)'}
                </button>
                <button onClick={listen} className="btn-soft px-3 py-1.5 text-xs">
                  {playing ? <Pause size={14} /> : <Volume2 size={14} />} {playing ? "To'xtatish" : 'Tinglash'}
                </button>
              </div>
            }
          >
            {hideText ? (
              <div className="grid h-60 place-items-center rounded-xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">🎧 Tinglang va asosiy fikrni tushunishga harakat qiling</div>
            ) : (
              <p className="whitespace-pre-line leading-relaxed">{set.text}</p>
            )}
            {set.glossary?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                {set.glossary.map((g) => (
                  <span key={g.word} className="chip bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <b>{g.word}</b> — {g.uz}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <div className="space-y-3">
            {set.questions.map((q) => {
              const r = result?.results?.[q.id]
              return (
                <div key={q.id} className="card p-4">
                  <p className="mb-2 flex items-start gap-2 font-medium">
                    {r && (r.correct ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />)}
                    {q.id}. {q.question}
                  </p>
                  <div className="grid gap-1.5">
                    {q.options.map((o, oi) => {
                      const sel = answers[q.id] === oi
                      const cls = r
                        ? oi === r.correct_index
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                          : sel
                            ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/10'
                            : 'border-slate-200 dark:border-slate-800'
                        : sel
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
                      return (
                        <button key={oi} disabled={!!r} onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} className={`rounded-lg border px-3 py-2 text-left text-sm ${cls}`}>
                          {'ABCD'[oi]}) {o}
                        </button>
                      )
                    })}
                  </div>
                  {r?.explanation_uz && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">💡 {r.explanation_uz}</p>}
                </div>
              )
            })}
            {result ? (
              <div className="card text-center font-semibold">
                Natija: {result.score}/{result.total} {result.score === result.total ? '🎉' : ''}
              </div>
            ) : (
              <button onClick={submit} disabled={busy || Object.keys(answers).length === 0} className="btn-primary w-full py-3">
                {busy && <Spinner />} Javoblarni tekshirish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
