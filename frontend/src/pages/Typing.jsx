import { motion } from 'framer-motion'
import { ArrowRight, Copy, Keyboard, Languages, PlayCircle, RotateCcw, Volume2, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AILoading, ErrorBox, PageHeader, ProgressBar } from '../components/ui'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { speak } from '../lib/speech'
import { wordDiff } from '../lib/textdiff'

export default function Typing() {
  const { gainXP } = useApp()
  const [mode, setMode] = useState('translate') // translate | copy
  const [items, setItems] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState(null)
  const [results, setResults] = useState([])
  const [startTs, setStartTs] = useState(null)
  const [sessionStart, setSessionStart] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => inputRef.current?.focus(), [i, items, checked])

  const load = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.typingSet(10)
      setItems(r.items)
      setI(0)
      setResults([])
      setTyped('')
      setChecked(null)
      setSessionStart(Date.now())
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const item = items?.[i]
  const finished = items && i >= items.length

  const check = () => {
    if (!typed.trim()) return
    const secs = Math.max(1, (Date.now() - (startTs || Date.now())) / 1000)
    const wpm = Math.round(typed.length / 5 / (secs / 60))
    const d = wordDiff(item.en, typed)
    const res = { ...d, wpm }
    setChecked(res)
    setResults((r) => [...r, res])
  }

  const next = async () => {
    setChecked(null)
    setTyped('')
    setStartTs(null)
    const ni = i + 1
    setI(ni)
    if (ni >= items.length) {
      const good = [...results].filter((r) => r.accuracy >= 90).length
      const minutes = Math.round((Date.now() - sessionStart) / 60000)
      const r = await api.practiceResult({ kind: 'typing', correct: good, total: items.length, minutes })
      gainXP(r.xp_earned)
    }
  }

  const avg = (k) => (results.length ? Math.round(results.reduce((s, r) => s + r[k], 0) / results.length) : 0)

  if (busy) return <AILoading text="Oxirgi mavzularingiz bo'yicha gaplar tayyorlanmoqda" steps={['Grammatikani tanlayapman...', 'Gaplar tuzyapman...', 'Tarjima qilyapman...']} />

  return (
    <div>
      <PageHeader icon={Keyboard} title="Typing & Sentence Building" subtitle="Dushanba mashqi: o'zbekchadan inglizchaga tez va aniq gap tuzish" />
      <ErrorBox error={error} />

      {!items && (
        <div className="card mx-auto max-w-xl space-y-5 text-center">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['translate', Languages, 'Gap tuzish', "O'zbekcha gapni inglizchaga yozasiz"],
              ['copy', Copy, 'Tez yozish', 'Inglizcha gapni aynan ko\'chirib yozasiz'],
            ].map(([id, Icon, t, d]) => (
              <button key={id} onClick={() => setMode(id)} className={`rounded-2xl border-2 p-4 text-left transition ${mode === id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                <Icon className="mb-2 text-brand-600" size={22} />
                <div className="font-semibold">{t}</div>
                <div className="text-xs text-slate-500">{d}</div>
              </button>
            ))}
          </div>
          <button onClick={load} className="btn-primary w-full py-3">
            <PlayCircle size={18} /> 10 ta gap bilan boshlash
          </button>
        </div>
      )}

      {items && !finished && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {i + 1} / {items.length} · <span className="text-brand-600">{item.grammar}</span>
            </span>
            <span className="flex items-center gap-3">
              <span>
                <Zap size={14} className="inline text-amber-500" /> {avg('wpm')} WPM
              </span>
              <span>🎯 {avg('accuracy')}%</span>
            </span>
          </div>
          <ProgressBar value={i} max={items.length} />

          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
            <div className="text-xl font-semibold text-slate-900 dark:text-white">{mode === 'translate' ? item.uz : item.en}</div>
            <textarea
              ref={inputRef}
              className="input min-h-24 font-mono text-base"
              value={typed}
              disabled={!!checked}
              onChange={(e) => {
                if (!startTs) setStartTs(Date.now())
                setTyped(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  checked ? next() : check()
                }
              }}
              onPaste={(e) => mode === 'copy' && e.preventDefault()}
              placeholder="Inglizcha yozing va Enter bosing..."
            />
            {checked && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5 text-base">
                  {checked.parts.map((p, k) => (
                    <span
                      key={k}
                      className={
                        p.t === 'ok'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : p.t === 'missing'
                            ? 'rounded bg-amber-100 px-1 font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                            : 'rounded bg-rose-100 px-1 text-rose-700 line-through dark:bg-rose-500/20 dark:text-rose-300'
                      }
                    >
                      {p.w}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                  <span>
                    <b>Namuna:</b> {item.en}
                    <button onClick={() => speak(item.en)} className="ml-2 align-middle text-slate-400 hover:text-brand-600" aria-label="Tinglash">
                      <Volume2 size={14} />
                    </button>
                  </span>
                  <span className={`font-bold ${checked.accuracy >= 90 ? 'text-emerald-600' : checked.accuracy >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {checked.accuracy}% · {checked.wpm} WPM
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  <span className="text-amber-700">sariq</span> — tushib qolgan so'z, <span className="text-rose-600 line-through">qizil</span> — ortiqcha/xato so'z.
                  {mode === 'translate' && ' Tarjimada boshqa to\'g\'ri variantlar ham bo\'lishi mumkin.'}
                </p>
              </div>
            )}
            <div className="flex justify-end">
              {checked ? (
                <button onClick={next} className="btn-primary">
                  Keyingi <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={check} disabled={!typed.trim()} className="btn-primary">
                  Tekshirish (Enter)
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {finished && (
        <div className="card mx-auto max-w-md space-y-4 text-center">
          <div className="text-5xl">🏁</div>
          <h2 className="text-xl font-bold">Mashq tugadi!</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-2xl font-bold text-brand-600">{avg('accuracy')}%</div>
              <div className="text-xs text-slate-500">o'rtacha aniqlik</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-2xl font-bold text-amber-600">{avg('wpm')}</div>
              <div className="text-xs text-slate-500">WPM (so'z/daqiqa)</div>
            </div>
          </div>
          <button onClick={load} className="btn-primary w-full">
            <RotateCcw size={16} /> Yangi 10 ta gap
          </button>
        </div>
      )}
    </div>
  )
}
