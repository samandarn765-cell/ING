import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen, Briefcase, Coffee, GraduationCap, Headphones, Keyboard, MessageCircle, Mic, MicOff, Plane, Repeat,
  Send, Settings2, Square, Volume2, VolumeX, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErrorBox, PageHeader, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { pickDefaultVoice, speak, stopSpeaking, sttSupported, useSpeechRecognition, useVoices } from '../lib/speech'

const TOPICS = [
  { id: 'free', title: 'Erkin suhbat', desc: "Kuningiz, qiziqishlaringiz, rejalaringiz", icon: MessageCircle },
  { id: 'lessons', title: 'Mening darslarim', desc: 'Oxirgi 3 ta dars grammatikasi va so\'zlari', icon: GraduationCap },
  { id: 'cafe', title: 'Kafeda', desc: 'Role-play: buyurtma berish', icon: Coffee },
  { id: 'interview', title: 'Ish suhbati', desc: 'Role-play: intervyu', icon: Briefcase },
  { id: 'travel', title: 'Londonda sayohat', desc: "Role-play: yo'l so'rash", icon: Plane },
  { id: 'exam', title: 'Speaking imtihon', desc: 'Part 1 & 2 savollari', icon: BookOpen },
]

function readPref(key, def) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? def : JSON.parse(v)
  } catch {
    return def
  }
}
function writePref(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

function CorrectionCard({ c, praise, onListen, onRepeat }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-11 mt-2 max-w-[85%] rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm dark:border-amber-900/50 dark:bg-amber-500/5">
      {praise && <p className="mb-1.5 font-semibold text-amber-900 dark:text-amber-200">{praise}</p>}
      <div className="flex flex-col gap-1">
        {c.original && <span className="text-rose-600 line-through dark:text-rose-400">✗ {c.original}</span>}
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">✓ {c.corrected}</span>
      </div>
      {c.explanation_uz && <p className="mt-2 text-amber-900/90 dark:text-amber-100/80">{c.explanation_uz}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onListen} className="chip bg-white px-3 py-1.5 text-amber-800 shadow-sm hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-200">
          <Volume2 size={13} /> Tinglash
        </button>
        {onRepeat && (
          <button onClick={onRepeat} className="chip bg-amber-500 px-3 py-1.5 text-white shadow-sm hover:bg-amber-600">
            <Repeat size={13} /> Qaytarib aytish
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function Speaking() {
  const { gainXP } = useApp()
  const voices = useVoices()
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [voiceName, setVoiceName] = useState(() => readPref('voice', ''))
  const [rate, setRate] = useState(() => readPref('rate', 0.95))
  const [autoSpeak, setAutoSpeak] = useState(() => readPref('autoSpeak', true))
  const [handsFree, setHandsFree] = useState(() => readPref('handsFree', false))
  const [stats, setStats] = useState({ turns: 0, corrections: 0, xp: 0 })
  const endRef = useRef(null)
  const handsFreeRef = useRef(handsFree)
  handsFreeRef.current = handsFree

  const voice = voices.find((v) => v.name === voiceName) || pickDefaultVoice(voices)

  const say = (t, after) => {
    setSpeaking(true)
    speak(t, {
      voice,
      rate,
      onEnd: () => {
        setSpeaking(false)
        after?.()
      },
    })
  }

  const send = async (msg) => {
    const content = (msg ?? text).trim()
    if (!content || !session || busy) return
    setText('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', content }])
    setBusy(true)
    try {
      const r = await api.sendSpeaking(session.session_id, content)
      setMessages((m) => [...m, { role: 'assistant', content: r.reply, correction: r.correction, praise: r.praise_uz }])
      setStats((s) => ({ turns: s.turns + 1, corrections: s.corrections + (r.correction ? 1 : 0), xp: s.xp + r.xp_earned }))
      gainXP(r.xp_earned)
      if (autoSpeak) {
        // Tuzatish bo'lsa: avval to'g'ri gapni, keyin javobni aytadi
        const spoken = r.correction ? `By the way, we say: ${r.correction.corrected} ... ${r.reply}` : r.reply
        say(spoken, () => handsFreeRef.current && sttSupported && rec.start())
      }
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const rec = useSpeechRecognition({ lang: 'en-US', onFinal: (t) => send(t) })

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, busy, rec.interim])
  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => writePref('voice', voiceName), [voiceName])
  useEffect(() => writePref('rate', rate), [rate])
  useEffect(() => writePref('autoSpeak', autoSpeak), [autoSpeak])
  useEffect(() => writePref('handsFree', handsFree), [handsFree])

  const start = async (topic) => {
    setError(null)
    setBusy(true)
    try {
      const s = await api.startSpeaking(topic)
      setSession(s)
      setMessages([{ role: 'assistant', content: s.reply }])
      setStats({ turns: 0, corrections: 0, xp: 0 })
      if (autoSpeak) say(s.reply, () => handsFreeRef.current && sttSupported && rec.start())
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const end = () => {
    rec.abort()
    stopSpeaking()
    setSession(null)
    setMessages([])
  }

  const micClick = () => {
    if (rec.listening) rec.stop()
    else {
      stopSpeaking()
      setSpeaking(false)
      rec.start()
    }
  }

  if (!session) {
    return (
      <div>
        <PageHeader icon={Mic} title="AI Speaking Partner" subtitle="Emma — do'stona repetitor. Gapiring, xato qilsangiz muloyimlik bilan to'g'rilaydi." />
        {!sttSupported && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Brauzeringiz ovozni tanishni (SpeechRecognition) qo'llab-quvvatlamaydi. <b>Google Chrome</b> yoki <b>Microsoft Edge</b> dan foydalaning. Hozircha yozib suhbatlashishingiz mumkin.
          </div>
        )}
        <ErrorBox error={error} />
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              disabled={busy}
              onClick={() => start(t.id)}
              className="card group flex items-start gap-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-300">
                <t.icon size={22} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{t.title}</div>
                <div className="text-sm text-slate-500">{t.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
        <div className="mt-6 card flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
          <Headphones size={20} className="mt-0.5 shrink-0 text-brand-600" />
          <div>
            <b className="text-slate-900 dark:text-white">Maslahat:</b> quloqchin taqing (aks-sado bo'lmasligi uchun). Mikrofon tugmasini bosing, gapiring, tugatgach yana bosing —
            gapingiz avtomatik yuboriladi. "Hands-free" rejimida Emma gapirib bo'lgach mikrofon o'zi yoqiladi.
          </div>
        </div>
      </div>
    )
  }

  const topic = TOPICS.find((t) => session.session_id.includes(`-${t.id}-`)) || TOPICS[0]
  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf('assistant')

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col lg:h-[calc(100vh-5rem)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-brand-600 text-lg font-bold text-white">E</div>
            {speaking && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />}
          </div>
          <div>
            <div className="font-semibold">Emma · {topic.title}</div>
            <div className="text-xs text-slate-500">
              {stats.turns} gap · {stats.corrections} tuzatish · +{stats.xp} XP
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAutoSpeak(!autoSpeak)} className="btn-ghost px-3" title="Ovozli javob">
            {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost px-3" title="Sozlamalar">
            <Settings2 size={16} />
          </button>
          <button onClick={end} className="btn-ghost px-3 text-rose-600" title="Tugatish">
            <X size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="card mb-3 grid gap-4 p-4 sm:grid-cols-3">
              <div>
                <label className="label">Emma ovozi</label>
                <select className="input" value={voice?.name || ''} onChange={(e) => setVoiceName(e.target.value)}>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tezlik: {rate.toFixed(2)}x</label>
                <input type="range" min="0.6" max="1.3" step="0.05" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-brand-600" />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                Hands-free (avtomatik mikrofon)
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-brand-600 text-sm font-bold text-white">E</div>}
              <div className={`group max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 dark:bg-slate-800'}`}>
                {m.content}
                {m.role === 'assistant' && (
                  <button onClick={() => say(m.content)} className="ml-2 inline align-middle text-slate-400 opacity-60 hover:text-brand-600 group-hover:opacity-100" aria-label="Tinglash">
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            </div>
            {m.correction && (
              <CorrectionCard
                c={m.correction}
                praise={m.praise}
                onListen={() => say(m.correction.corrected)}
                onRepeat={i === lastAssistantIdx && sttSupported ? micClick : null}
              />
            )}
            {!m.correction && m.praise && <p className="ml-11 mt-1 text-sm font-medium text-emerald-600">🎉 {m.praise}</p>}
          </div>
        ))}
        {rec.listening && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-md border-2 border-dashed border-brand-300 px-4 py-2.5 text-slate-500">{rec.interim || 'Tinglayapman...'}</div>
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-2 pl-11 text-sm text-slate-500">
            <span className="flex gap-1">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="h-2 w-2 rounded-full bg-slate-400" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.15 }} />
              ))}
            </span>
            Emma o'ylayapti
          </div>
        )}
        <div ref={endRef} />
      </div>

      <ErrorBox error={error || (rec.error && { message: rec.error })} />

      <div className="mt-3 flex items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex flex-1 gap-2"
        >
          <div className="relative flex-1">
            <Keyboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" value={text} onChange={(e) => setText(e.target.value)} placeholder="Yoki shu yerga yozing..." disabled={rec.listening} />
          </div>
          <button className="btn-ghost px-3" disabled={!text.trim() || busy} aria-label="Yuborish">
            <Send size={16} />
          </button>
        </form>
        {sttSupported && (
          <div className="relative">
            {rec.listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />}
            <button
              onClick={micClick}
              disabled={busy}
              className={`relative grid h-16 w-16 place-items-center rounded-full text-white shadow-lg transition ${rec.listening ? 'bg-rose-500 shadow-rose-500/40' : 'bg-brand-600 shadow-brand-600/40 hover:bg-brand-700'} disabled:opacity-50`}
              aria-label={rec.listening ? "To'xtatish va yuborish" : 'Gapirish'}
            >
              {busy ? <Spinner size={24} /> : rec.listening ? <Square size={22} fill="currentColor" /> : <Mic size={26} />}
            </button>
          </div>
        )}
        {!sttSupported && <MicOff className="text-slate-400" />}
      </div>
    </div>
  )
}
