import { Lightbulb, RefreshCw, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { speak } from '../lib/speech'
import { Badge, Spinner } from './ui'

const MASTERY = {
  new: ['Yangi', 'slate'],
  learning: ["O'rganilmoqda", 'amber'],
  reviewing: ['Takrorlanmoqda', 'brand'],
  mastered: ['Yodlangan', 'green'],
}

export default function WordCard({ word, onUpdate }) {
  const [mnemonics, setMnemonics] = useState(null)
  const [busy, setBusy] = useState(false)
  const [m, tone] = MASTERY[word.mastery] || MASTERY.new

  const loadMnemonics = async () => {
    setBusy(true)
    try {
      setMnemonics((await api.mnemonics(word.id)).mnemonics)
    } catch (e) {
      setMnemonics([e.message])
    } finally {
      setBusy(false)
    }
  }
  const choose = async (text) => {
    const updated = await api.updateWord(word.id, { mnemonic: text })
    onUpdate?.(updated)
    setMnemonics(null)
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white">{word.word}</span>
            <button onClick={() => speak(word.word)} className="text-slate-400 hover:text-brand-600" aria-label="Talaffuz">
              <Volume2 size={16} />
            </button>
          </div>
          <div className="text-xs italic text-slate-500">{word.part_of_speech}</div>
        </div>
        <Badge tone={tone}>{m}</Badge>
      </div>
      <p className="mt-2 font-medium text-brand-700 dark:text-brand-300">{word.translation_uz}</p>
      {word.definition_en && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{word.definition_en}</p>}
      {word.example_sentence && (
        <p className="mt-2 border-l-2 border-brand-300 pl-3 text-sm italic text-slate-600 dark:text-slate-400">
          {word.example_sentence}
          <button onClick={() => speak(word.example_sentence)} className="ml-1.5 inline align-middle text-slate-400 hover:text-brand-600" aria-label="Tinglash">
            <Volume2 size={13} />
          </button>
        </p>
      )}
      {word.mnemonic && (
        <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <Lightbulb size={16} className="mt-0.5 shrink-0" />
          <span>{word.mnemonic}</span>
        </div>
      )}
      <button onClick={loadMnemonics} disabled={busy} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
        {busy ? <Spinner size={12} /> : <RefreshCw size={12} />} Boshqa assotsiatsiya
      </button>
      {mnemonics && (
        <div className="mt-2 space-y-1.5">
          {mnemonics.map((t, i) => (
            <button key={i} onClick={() => choose(t)} className="block w-full rounded-lg border border-dashed border-amber-300 p-2 text-left text-xs hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-500/10">
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
