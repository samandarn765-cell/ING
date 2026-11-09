// Web Speech API: SpeechRecognition (STT) va SpeechSynthesis (TTS) uchun React hook'lar.
import { useCallback, useEffect, useRef, useState } from 'react'

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const sttSupported = !!Recognition
export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeechRecognition({ lang = 'en-US', onFinal } = {}) {
  const recRef = useRef(null)
  const finalRef = useRef('')
  const onFinalRef = useRef(onFinal)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)
  onFinalRef.current = onFinal

  const start = useCallback(() => {
    if (!Recognition) return
    window.speechSynthesis?.cancel() // AI gapirayotgan bo'lsa to'xtatamiz
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = true // pauza qilsangiz ham tinglashda davom etadi; "Stop" bosilganda yuboriladi
    rec.maxAlternatives = 1
    finalRef.current = ''
    setInterim('')
    setError(null)

    rec.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalRef.current += r[0].transcript + ' '
        else interimText += r[0].transcript
      }
      setInterim((finalRef.current + interimText).trim())
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setError("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.")
      else if (e.error === 'no-speech') setError("Ovoz eshitilmadi. Qaytadan urinib ko'ring.")
      else if (e.error !== 'aborted') setError(`Mikrofon xatosi: ${e.error}`)
    }
    rec.onend = () => {
      setListening(false)
      const text = finalRef.current.trim()
      if (text) onFinalRef.current?.(text)
      finalRef.current = ''
      setInterim('')
    }
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [lang])

  const stop = useCallback(() => recRef.current?.stop(), [])
  const abort = useCallback(() => {
    finalRef.current = ''
    recRef.current?.abort()
  }, [])

  useEffect(() => () => recRef.current?.abort(), [])
  return { listening, interim, error, start, stop, abort, supported: sttSupported }
}

export function useVoices() {
  const [voices, setVoices] = useState([])
  useEffect(() => {
    if (!ttsSupported) return
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en')))
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  return voices
}

/** Eng tabiiy eshitiladigan ingliz ovozini tanlash (Google/Microsoft "Natural" ovozlari afzal). */
export function pickDefaultVoice(voices) {
  const prefs = [/natural/i, /google us english/i, /samantha/i, /aria|jenny|libby|sonia/i, /en-us/i]
  for (const p of prefs) {
    const v = voices.find((x) => p.test(x.name) || p.test(x.lang))
    if (v) return v
  }
  return voices[0]
}

export function speak(text, { voice, rate = 0.95, onEnd } = {}) {
  if (!ttsSupported || !text) return onEnd?.()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang || 'en-US'
  if (voice) u.voice = voice
  u.rate = rate
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}
