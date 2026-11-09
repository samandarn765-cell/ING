// Brauzer bildirishnomalari (Notification API). Sahifa ochiq turgan paytda dars vaqtida eslatadi.
// Brauzer yopiq bo'lsa — Telegram bot eslatmasi (backend scheduler) ishlaydi.

const THEMES = {
  1: ['⌨️ Typing & Sentence Building', 'Bugun tez gap tuzish kuni!'],
  2: ['🧠 Vocabulary kuni', "So'zlarni takrorlash vaqti keldi!"],
  3: ['📖 Reading & Listening', "Bugun o'qish va tinglash kuni."],
  4: ['🎙 Speaking kuni', 'Emma bilan suhbatlashish vaqti!'],
  5: ['🎯 Mock Test kuni', 'Haftalik test va xatolar ustida ishlash!'],
  6: ['🔁 Yengil takrorlash', '1 soatlik takrorlash.'],
  0: ['🌿 Dam olish kuni', 'Xohlasang 30 daqiqa erkin suhbat qil.'],
}

export const notifySupported = typeof window !== 'undefined' && 'Notification' in window

export async function requestPermission() {
  if (!notifySupported) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export function showStudyReminder(dueWords = 0) {
  if (!notifySupported || Notification.permission !== 'granted') return
  const [title, body] = THEMES[new Date().getDay()]
  const extra = dueWords ? ` ${dueWords} ta so'z takrorlashni kutmoqda.` : ''
  const n = new Notification(`⏰ Dars vaqting bo'ldi! ${title}`, { body: body + extra, icon: '/favicon.svg', tag: 'study-reminder' })
  n.onclick = () => {
    window.focus()
    n.close()
  }
}

/** Har 30 soniyada tekshiradi; studyTime ("19:00") kelganda kuniga bir marta eslatma beradi. */
export function startReminderLoop(getStudyTime, getDue) {
  const check = () => {
    const time = getStudyTime()
    if (!time) return
    const now = new Date()
    const hhmm = now.toTimeString().slice(0, 5)
    const key = `reminded-${now.toDateString()}`
    let already = false
    try {
      already = localStorage.getItem(key) === '1'
    } catch {
      /* ignore */
    }
    if (hhmm === time && !already) {
      showStudyReminder(getDue())
      try {
        localStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
    }
  }
  const id = setInterval(check, 30000)
  check()
  return () => clearInterval(id)
}
