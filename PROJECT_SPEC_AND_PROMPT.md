# 🚀 EduPrep AI: International School O'quvchilari Uchun Shaxsiy AI Repetitor & Mentor

> **Loyiha maqsadi:** International School o'quv markazi dasturi asosida haftalik testlardan muvaffaqiyatli o'tish, uy ishlaridagi qiyin mavzularni o'zbek/ingliz tilida tushuntirish, jonli AI Speaking suhbatdoshi yaratish va har 3 ta uy ishidan so'ng haqiqiy testga o'xshash simulyatsiya (mock test) o'tkazish.

---

## 💡 Qo'shilgan Senior Darajadagi Aqlli G'oyalar (Bonus Features)

1. **SRS (Spaced Repetition System - SM-2 Algoritmi):** Yodlangan so'zlar 1-kun, 3-kun, 7-kun va 14-kundan keyin avtomatik takrorlashga chiqariladi (Anki tizimi kabi).
2. **"Weak Spot" (Xatolar daftarchasi):** Testlarda va uy ishlarida yiqilgan/xato qilgan har bir savol alohida bazaga tushadi va AI aynan shu xatolarga oid maxsus tushuntirish beradi.
3. **Telegram Bot Eslatmasi (Push Notification):** Brauzer yopiq bo'lsa ham, Telegram orqali *"Bugun Vocabulary kuni, 30 ta yangi so'zni takrorlash vaqti bo'ldi!"* deb xabar yuboradi.
4. **Interactive Speaking (Web Speech API / Whisper + ElevenLabs/EdgeTTS):** Brauzerning o'zida mikrofonga gapirasiz, AI real vaqtda javob qaytaradi, talaffuz (pronunciation) va grammatik xatolarni darhol muloyimlik bilan to'g'rilaydi.
5. **Exam Simulator (3 ta uy ishidan so'ng):** Foydalanuvchi oxirgi 3 ta uy ishi mavzularini kiritishi bilan tizim International School test formatidagi (Multiple choice, Fill-in-the-blanks, Sentence correction) 25-30 talik maxsus Mock Test yaratadi.

---

## 🛠 Texnologiyalar Steki (Tech Stack)

- **Frontend:** React (Vite / Next.js) + Tailwind CSS + Lucide Icons + Framer Motion (zamonaviy, chiroyli UI/UX).
- **Backend:** Python (FastAPI) — tezkor, asinxron va AI integratsiyalari uchun eng qulay freymvork.
- **AI Integratsiya:** Google Gemini 1.5 / OpenAI GPT-4o API (Matn, Speaking, Tushuntirish va Test generatsiyasi uchun).
- **Speech Engine:** Web Speech API (yoki Whisper STT) + TTS (Text-to-Speech) jonli ovozli suhbat uchun.
- **Database:** SQLite (boshlash uchun) yoki PostgreSQL + SQLAlchemy ORM.
- **Scheduler:** APScheduler yoki Celery (Haftalik 2 soatlik o'qish tartibi va eslatmalar uchun).

---

## 📋 Tizim Arxitekturasi va Ma'lumotlar Bazasi Modeli (DB Schema)

```sql
-- 1. Foydalanuvchi dars va rejalari
Users (id, name, level, target_score);

-- 2. Uy ishlari va mavzular
Homeworks (
  id, 
  user_id, 
  homework_number, 
  topic_name, 
  grammar_points, 
  raw_notes, 
  created_at
);

-- 3. Lug'at boyligi (Vocabulary + SRS)
Vocabulary (
  id, 
  user_id, 
  word, 
  translation_uz, 
  definition_en, 
  example_sentence, 
  repetitions, 
  next_review_date
);

-- 4. Testlar va Natijalar
MockTests (
  id, 
  user_id, 
  based_on_homework_ids, 
  score, 
  total_questions, 
  weak_topics, 
  created_at
);

-- 5. AI Suhbatlar tarixi (Speaking / Q&A)
ChatHistory (
  id, 
  user_id, 
  mode, -- 'speaking', 'homework_explainer', 'general_qa'
  message_role, 
  message_content, 
  timestamp
);
```

---

## 🎯 TO'LIQ KODLASH MASTER PROMPTI (AI vositalari uchun)

> **Ushbu qismni to'liq nusxalab (copy qilib) AI yordamchisiga (yoki loyihani yaratishda) berishingiz mumkin:**

```markdown
Sen 10 yillik tajribaga ega Senior Full-Stack Developer va EdTech AI Architectsan.
Mening muammom: Men "International School" o'quv markazida ingliz tilini o'rganmoqdaman. Uy vazifalari maxsus dasturda bajariladi va har hafta bilimni tekshirish uchun qiyin test olinadi. Hozirda bu testlardan yiqilmoqdaman. 

Menga o'quv markazim testlariga tayyorlaydigan, uy ishlarimni tushuntirib beradigan, men bilan odamdek gaplashadigan (speaking) va intizomli o'qish tartibini shakllantiruvchi to'liq Full-Stack Web ilovani (React + Tailwind CSS + Python FastAPI) yaratib berishingni xohlayman.

### ASOSIY TALABLAR VA MODULLAR:

1. 📚 SMART HOMEWORK & TOPIC EXPLAINER:
   - Men har bir uy vazifamda o'tilgan mavzular (masalan: "Present Perfect vs Past Simple", "Conditionals Type 2") va yangi so'zlarni kiritaman.
   - AI ushbu mavzuni juda sodda, do'stona, tushunarli o'zbek tilida (hayotiy misollar va analogiyalar bilan) tushuntirib beradi.
   - Ushbu mavzuga oid 3-5 ta "interactive drill" (mustahkamlash mashqi) generatsiya qiladi.

2. 🧪 3-HOMEWORK MOCK EXAM GENERATOR (Testga tayyorgarlik):
   - Har 3 ta uy vazifasi kiritilgandan so'ng, tizim avtomatik ravishda "Haftalik Test Simulyatsiyasi" rejimini faollashtiradi.
   - Oxirgi 3 ta mavzu va barcha yangi so'zlar bo'yicha 20-25 talik xalqaro maktab formatidagi test yaratiladi:
     * 10 ta Grammatika (ko'p tanlovli)
     * 5 ta Xatolarni topish (Error spotting)
     * 5 ta Contextual Vocabulary (bo'sh joylarni to'ldirish)
     * 5 ta Reading comprehension / Sentence completion.
   - Natija chiqqach, qaysi savollardan yiqilsam, ularni "Weak Spots" bo'limiga saqlaydi va har bir xatoning nima uchun xato ekanligini batafsil tahlil qiladi.

3. 🎙 HUMAN-LIKE AI SPEAKING PARTNER:
   - Brauzerdagi Web Speech API yoki audio yozish orqali AI bilan jonli suhbat.
   - AI do'stona, qiziqarli o'qituvchi kabi men bilan kundalik mavzularda, so'nggi o'tilgan grammatika doirasida gaplashadi.
   - Agar men gap tuzishda grammatik yoki talaffuzda xato qilsam, gapimni to'xtatmasdan, muloyimlik bilan: "Ajoyib fikr! Faqat 'I have seen him yesterday' emas, 'I saw him yesterday' desangiz to'g'ri bo'ladi" deb o'rgatib ketadi.

4. 📅 AI STUDY AGENT & SM-2 VOCABULARY PLANNER:
   - Haftalik reja: Har haftada belgilangan vaqt (masalan, haftasiga 5 kun, 2 soatdan):
     * 1-kun: Typing & Sentence structure (gap tuzish tezligi)
     * 2-kun: Active Vocabulary (SRS tizimi bo'yicha kartochkalar)
     * 3-kun: Reading & Listening tahlili
     * 4-kun: Speaking & Voice practice
     * 5-kun: Mock Test & Xatolar ustida ishlash.
   - Bildirishnoma (Notification / Telegram Webhook): Dars vaqti bo'lganda eslatma chiqarish.

5. 🎨 UI/UX DIZAYNI (Senior Frontend):
   - Zamonaviy Dark/Light mode, toza Tailwind CSS dizayni.
   - Bosh sahifada: "Hozirgi progress", "Keyingi testgacha qolgan kunlar", "Bugungi 2 soatlik vazifa" statusi.
   - O'zbekcha va Inglizcha tilda ishlay oladigan qulay til almashuvi.

Iltimos, ushbu loyihani modulli, toza kodlangan, production-ready qilib arxitektura va kodlarini bosqichma-bosqich yozib ber.
```

---

## 🚀 Keyingi Bosqich: Loyihani Boshlash

Ushbu loyihani o'zingizning kompyuteringizda ishga tushirish uchun quyidagi tuzilma tavsiya etiladi:

```
ing/
├── frontend/             # React + Tailwind CSS ilovasi
│   ├── src/
│   │   ├── components/  # SpeakingModal, HomeworkForm, MockTest, VocabCards
│   │   ├── pages/       # Dashboard, SpeakingRoom, ExamCenter, Planner
│   │   └── App.jsx
├── backend/              # Python FastAPI serveri
│   ├── routers/         # homework.py, exam.py, speaking.py, agent.py
│   ├── services/        # ai_service.py (Gemini/OpenAI), srs_service.py
│   ├── models.py        # SQLite / SQLAlchemy modellari
│   └── main.py
└── PROJECT_SPEC_AND_PROMPT.md
```

