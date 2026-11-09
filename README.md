# 🎓 EduPrep AI — Shaxsiy AI ingliz tili repetitori

"International School" haftalik testlariga tayyorlovchi to'liq ishlaydigan veb-ilova:
**React (Vite) + Tailwind CSS + Framer Motion** frontend, **FastAPI + SQLAlchemy + SQLite** backend,
**Google Gemini yoki OpenAI GPT-4o** AI, **Web Speech API** (ovozli suhbat).

---

## 🚀 Ishga tushirish (5 daqiqa)

### Talablar
- Python 3.11+ (3.13 bilan sinovdan o'tgan)
- Node.js 18+
- **Google Chrome yoki Microsoft Edge** (Speaking Room uchun ovozni tanish faqat Chromium brauzerlarda ishlaydi)

### 1-qadam: AI kalitini olish
- **Gemini (bepul limit bor):** https://aistudio.google.com/app/apikey → "Create API key"
- yoki **OpenAI:** https://platform.openai.com/api-keys

`backend/.env` faylini oching (yo'q bo'lsa `backend/.env.example` dan nusxa oling) va kalitni yozing:
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...sizning_kalitingiz
```
OpenAI uchun: `AI_PROVIDER=openai` va `OPENAI_API_KEY=sk-...`

### 2-qadam: Ishga tushirish

**Eng oson yo'l (Windows):** `start.bat` faylini ikki marta bosing. U hamma narsani o'rnatadi va brauzerni ochadi.

**Qo'lda:**
```bash
# Terminal 1 — backend
cd backend
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```
Brauzerda oching: **http://localhost:5173** · API hujjatlari (Swagger): **http://localhost:8000/docs**

### Testlar
```bash
cd backend
venv\Scripts\python tests\test_smoke.py
```
Smoke test AI'ni soxta javoblar bilan almashtirib, butun oqimni tekshiradi: uy vazifasi → drill → 25 savollik mock test → weak spots → speaking tuzatish → SRS → reja → XP/streak.

---

## 📦 Modullar

| Modul | Nima qiladi |
|---|---|
| 📚 **Smart Homework Explainer** | Mavzu + so'zlar + tushunmagan savollar → o'zbekcha sodda tushuntirish, hayotiy analogiya, formula, 5 ta misol, tipik xatolar, savollaringizga javob, imtihon maslahatlari va **5 ta interaktiv drill** (MCQ, fill, transform, error, word order). Mavzu bo'yicha qo'shimcha savol berish chati. |
| 🎯 **3-Homework Mock Test** | Har 3 ta uy vazifasidan so'ng avtomatik ochiladi. **25 savol:** 10 Grammar, 5 Error Spotting, 5 Vocabulary in Context, 5 Reading (gap filling + comprehension). Taymer, savollar navigatori, javoblar brauzerda saqlanadi (sahifa yopilsa yo'qolmaydi). Natijada bo'limlar bo'yicha ball, AI tahlili va har bir savol uchun "nima uchun xato" izohi. |
| 🗂 **Weak Spots** | Test, drill, reading va speaking'dagi barcha xatolar avtomatik saqlanadi (takrorlansa "3× xato" deb sanaladi). **AI Repair Lesson** — xatolardagi qonuniyatni topib, maxsus dars va 5 ta mashq tuzadi. |
| 🎙 **Speaking Room** | Emma — do'stona AI suhbatdosh. 6 ta rejim: erkin suhbat, "Mening darslarim" (oxirgi 3 dars grammatikasi), kafe, ish suhbati, sayohat, speaking imtihon. Xato qilsangiz muloyimlik bilan o'zbekcha tushuntiradi va gapni qaytarishni so'raydi; to'g'ri qaytarsangiz qo'shimcha XP. Ovoz tanlash, tezlik, hands-free rejim. |
| 🧠 **Lug'at · SRS** | SM-2 algoritmi (1 → 3 → 7 → 14+ kun). Flip-kartochkalar (EN→UZ va UZ→EN aralash), klaviatura: Space / 1-4. Har bir so'zga **o'zbekcha-inglizcha mnemonika** + "Boshqa assotsiatsiya" tugmasi. |
| ⌨️ **Typing & Sentence Building** | O'zbekcha gap → inglizcha yozish yoki tez ko'chirish. So'zma-so'z diff, aniqlik %, WPM. |
| 📖 **Reading & Listening** | Mavzularingiz asosidagi matn, TTS bilan tinglash (matnni yashirib), 6 ta savol. |
| 📅 **AI Study Agent** | Har kuni 2 soatlik haftalik reja (Du: Typing, Se: Vocabulary, Ch: Reading, Pa: Speaking, Ju: Mock Test). AI xatolaringiz, SRS va testgacha qolgan uy ishlariga qarab rejani shaxsiylashtiradi. |
| 🔔 **Eslatmalar** | Brauzer bildirishnomasi (sayt ochiq turganda) + **Telegram bot** (brauzer yopiq bo'lsa ham, backend scheduler har daqiqada tekshiradi). |
| 🏆 **Gamification** | XP, darajalar (Beginner → Legend), streak, 4 haftalik faollik xaritasi, test natijalari grafigi. |
| 🌗 **UI** | Dark/Light rejim, O'zbekcha/English menyu, mobil moslashuv. |

---

## 🤖 Telegram eslatmalarni ulash
1. Telegram'da **@BotFather** → `/newbot` → tokenni oling.
2. `backend/.env` → `TELEGRAM_BOT_TOKEN=123456:ABC...` va backendni qayta ishga tushiring.
3. O'z botingizni oching va **/start** yozing.
4. Ilovada **Sozlamalar → Telegram bot → Ulash** tugmasini bosing, so'ng "Test xabar".

Har kuni belgilangan vaqtda (masalan 19:00) shunday xabar keladi:
> ⏰ Dars vaqting bo'ldi! 🧠 Vocabulary Drills (SRS) — Bugun Vocabulary kuni... 📚 Bugun takrorlash kerak bo'lgan so'zlar: 25 ta.

Serverga deploy qilsangiz, `POST /api/planner/telegram/webhook` ni Telegram `setWebhook` orqali ulashingiz mumkin (`/start` va `/today` buyruqlari ishlaydi).

---

## 🏗 Arxitektura

```
ing/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI ilova, CORS, scheduler, xatolarni ushlash
│   │   ├── config.py            # .env sozlamalari (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy engine/session
│   │   ├── models.py            # User, Homework, Vocabulary, MockTest, WeakSpot, ChatMessage,
│   │   │                        # StudyPlan, PracticeSet, DailyActivity
│   │   ├── schemas.py           # Pydantic so'rov sxemalari
│   │   ├── serializers.py       # Model → JSON (javob kalitlari frontendga yuborilmaydi!)
│   │   ├── routers/
│   │   │   ├── homework.py      # /api/homeworks — tushuntirish, drill, savol-javob
│   │   │   ├── exam.py          # /api/mock-tests — 3-HW unlock, 25 savol, baholash, retake
│   │   │   ├── speaking.py      # /api/speaking — suhbat sessiyalari, tuzatishlar
│   │   │   ├── vocab.py         # /api/vocab — SRS review, mnemonika
│   │   │   ├── weakspots.py     # /api/weak-spots — xatolar, AI Repair Lesson
│   │   │   ├── planner.py       # /api/planner — haftalik reja, Telegram
│   │   │   ├── practice.py      # /api/practice — typing, reading
│   │   │   └── dashboard.py     # /api/dashboard, /api/me, /api/settings, /api/health
│   │   └── services/
│   │       ├── ai_service.py    # Gemini/OpenAI REST abstraksiyasi (bitta joyda almashtiriladi)
│   │       ├── prompts.py       # Barcha metodik promptlar
│   │       ├── srs_service.py   # SM-2 algoritmi
│   │       ├── checking.py      # Drill javoblarini tekshirish (contractions, 'd = had/would)
│   │       ├── gamification.py  # XP, level, streak
│   │       ├── weakspots.py     # Xatolarni saqlash, drill baholash
│   │       ├── notifier.py      # Telegram
│   │       └── scheduler.py     # APScheduler — kunlik eslatma
│   ├── tests/test_smoke.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx, main.jsx, index.css
│   │   ├── lib/                 # api.js, app.jsx (tema/til/XP), speech.js (Web Speech API),
│   │   │                        # notify.js (bildirishnoma), textdiff.js
│   │   ├── components/          # Layout, DrillRunner, WordCard, ui.jsx
│   │   └── pages/               # Dashboard, HomeworkList, HomeworkDetail, ExamCenter,
│   │                            # MockTestRunner, Speaking, Vocabulary, WeakSpots,
│   │                            # Typing, Reading, Planner, Settings
│   └── vite.config.js           # /api → localhost:8000 proxy
├── start.bat
└── PROJECT_SPEC_AND_PROMPT.md
```

### Muhim texnik qarorlar
- **Javob kalitlari himoyalangan:** drill va test javoblari faqat backendda turadi; frontend tekshirish uchun backendga yuboradi. Test topshirilgandan keyingina to'g'ri javoblar ko'rsatiladi.
- **Variantlar aralashtiriladi:** AI modellar to'g'ri javobni ko'pincha A/B ga qo'yadi — backend variantlarni tasodifiy aralashtiradi (error spotting'dan tashqari, u yerda segmentlar gap tartibida).
- **AI'siz ham ishlaydi:** kalit bo'lmasa yoki AI xato bersa, uy vazifasi va so'zlar baribir saqlanadi, keyin "Qayta yaratish" mumkin. SRS, reja, weak spots AI'siz ishlaydi.
- **XP "farm" qilinmaydi:** drill/vazifa uchun XP faqat birinchi marta beriladi.
- **Bitta foydalanuvchi:** shaxsiy ilova sifatida login yo'q (`deps.get_current_user`). Ko'p foydalanuvchiga o'tkazish uchun faqat shu funksiyani JWT bilan almashtirish kifoya.

---

## ❓ Muammolar
| Muammo | Yechim |
|---|---|
| "Backend ishlamayapti" banneri | `backend` papkasida `uvicorn app.main:app --reload --port 8000` ishlayotganini tekshiring |
| `Gemini xatosi (404)` | `.env` dagi `GEMINI_MODEL` ni AI Studio'da mavjud modelga o'zgartiring (masalan `gemini-2.5-flash` yoki `gemini-2.0-flash`) |
| `Gemini xatosi (429)` | Bepul limit tugadi — bir oz kuting yoki OpenAI'ga o'ting |
| Mikrofon ishlamayapti | Chrome/Edge ishlating, manzil satridagi 🔒 belgisidan mikrofonga ruxsat bering. `localhost` da HTTPS shart emas |
| Emma ovozi robotga o'xshaydi | Speaking → ⚙️ → "Microsoft ... Natural" yoki "Google US English" ovozini tanlang |
