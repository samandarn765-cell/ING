import { Bell, Bot, Check, Cpu, Send, Settings, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, ErrorBox, PageHeader, Section, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { notifySupported, requestPermission, showStudyReminder } from '../lib/notify'

const LEVELS = ['Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced']

export default function SettingsPage() {
  const { user, refreshUser, health, toast } = useApp()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tgBusy, setTgBusy] = useState(false)
  const [perm, setPerm] = useState(notifySupported ? Notification.permission : 'unsupported')

  useEffect(() => {
    if (user && !form) setForm({ name: user.name, level: user.level, target_score: user.target_score, study_time: user.study_time, telegram_chat_id: user.telegram_chat_id || '', notifications_enabled: user.notifications_enabled })
  }, [user, form])

  if (!form) return null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.updateSettings({ ...form, target_score: Number(form.target_score) })
      await refreshUser()
      toast('Saqlandi ✓')
    } catch (e) {
      setError(e)
    } finally {
      setSaving(false)
    }
  }

  const tg = async (fn, okMsg) => {
    setTgBusy(true)
    setError(null)
    try {
      const r = await fn()
      if (r?.telegram_chat_id) setForm((f) => ({ ...f, telegram_chat_id: r.telegram_chat_id }))
      await refreshUser()
      toast(okMsg)
    } catch (e) {
      setError(e)
    } finally {
      setTgBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} title="Sozlamalar" />
      <ErrorBox error={error} />

      <Section title="Profil" icon={User}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Ism</label>
            <input className="input" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label">Daraja</label>
            <select className="input" value={form.level} onChange={set('level')}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Maqsad ball (%)</label>
            <input type="number" min="0" max="100" className="input" value={form.target_score} onChange={set('target_score')} />
          </div>
        </div>
      </Section>

      <Section title="Dars vaqti va eslatmalar" icon={Bell}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Har kungi dars vaqti (2 soat)</label>
            <input type="time" className="input" value={form.study_time} onChange={set('study_time')} />
          </div>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.notifications_enabled} onChange={set('notifications_enabled')} />
            Eslatmalar yoqilgan
          </label>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">🖥 Brauzer bildirishnomasi</div>
            <Badge tone={perm === 'granted' ? 'green' : 'amber'}>{perm === 'granted' ? 'Ruxsat berilgan' : perm === 'unsupported' ? "Qo'llab-quvvatlanmaydi" : "Ruxsat yo'q"}</Badge>
          </div>
          <p className="mb-3 text-sm text-slate-500">Sayt ochiq turganda (hatto boshqa tabda) dars vaqtida eslatma chiqaradi.</p>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={!notifySupported} onClick={async () => setPerm(await requestPermission())}>
              Ruxsat berish
            </button>
            <button className="btn-ghost" disabled={perm !== 'granted'} onClick={() => showStudyReminder(0)}>
              Sinab ko'rish
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Bot size={18} /> Telegram bot
            </div>
            <Badge tone={user.telegram_chat_id ? 'green' : 'slate'}>{user.telegram_chat_id ? 'Ulangan' : 'Ulanmagan'}</Badge>
          </div>
          {!health?.telegram_configured ? (
            <p className="text-sm text-slate-500">
              Brauzer yopiq bo'lsa ham eslatma olish uchun: @BotFather'da bot yarating va tokenni <code>backend/.env</code> dagi <code>TELEGRAM_BOT_TOKEN</code> ga yozing, keyin backendni qayta ishga tushiring.
            </p>
          ) : (
            <>
              <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-500">
                <li>Telegram'da botingizni oching va <b>/start</b> yozing.</li>
                <li>"Ulash" tugmasini bosing — chat ID avtomatik topiladi.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <input className="input max-w-xs" value={form.telegram_chat_id} onChange={set('telegram_chat_id')} placeholder="Chat ID" />
                <button className="btn-soft" disabled={tgBusy} onClick={() => tg(api.linkTelegram, 'Telegram ulandi ✓')}>
                  {tgBusy ? <Spinner /> : <Check size={16} />} Ulash
                </button>
                <button className="btn-ghost" disabled={tgBusy || !user.telegram_chat_id} onClick={() => tg(api.testTelegram, 'Xabar yuborildi ✓')}>
                  <Send size={16} /> Test xabar
                </button>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title="AI holati" icon={Cpu}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          Provayder: <Badge tone="brand">{health?.ai_provider}</Badge>
          Model: <Badge>{health?.ai_model}</Badge>
          <Badge tone={health?.ai_configured ? 'green' : 'red'}>{health?.ai_configured ? 'Kalit bor' : "Kalit yo'q"}</Badge>
        </div>
        <p className="mt-2 text-xs text-slate-500">Provayder va modelni <code>backend/.env</code> faylida o'zgartirasiz (AI_PROVIDER=gemini|openai).</p>
      </Section>

      <button onClick={save} disabled={saving} className="btn-primary w-full py-3">
        {saving && <Spinner />} Saqlash
      </button>
    </div>
  )
}
