"""4-modul: AI Study Agent — haftalik 2 soatlik reja + bildirishnomalar."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Homework, StudyPlan, User, Vocabulary, WeakSpot
from ..schemas import PlanTaskToggle
from ..services import prompts
from ..services.ai_service import ai
from ..services.gamification import award_xp
from ..services.notifier import DAY_THEMES, WEEKDAY_KEYS, build_reminder, find_latest_chat_id, send_telegram, today_key

router = APIRouter(prefix="/api/planner", tags=["Planner"])


def week_start(d: date | None = None) -> date:
    d = d or date.today()
    return d - timedelta(days=d.weekday())


def default_plan(due: int) -> dict:
    """AI'siz ham ishlaydigan, metodik jihatdan to'g'ri asosiy reja."""
    t = lambda title, minutes, desc, link: {"title": title, "minutes": minutes, "description_uz": desc, "link": link}
    days = {
        "monday": [
            t("Warm-up: SRS words", 15, "Takrorlash vaqti kelgan so'zlarni tez ko'rib chiqing.", "/vocabulary"),
            t("Typing sprint", 40, "Oxirgi grammatika bo'yicha 10 ta gapni o'zbekchadan inglizchaga yozing (aniqlik ≥ 90%).", "/typing"),
            t("Sentence building", 35, "Homework drill'larini qayta ishlang, ayniqsa 'order' va 'transform' turlarini.", "/homework"),
            t("Mistake review", 30, "Weak Spots'dagi 5 ta xatoni o'qing va to'g'ri variantni ovoz chiqarib ayting.", "/weak-spots"),
        ],
        "tuesday": [
            t("SRS review session", 40, f"Bugun {due} ta so'z takrorlanishi kerak. Har bir so'zga mnemonikani o'qing.", "/vocabulary"),
            t("New words in context", 30, "Har bir yangi so'z bilan 1 tadan o'z gapingizni yozing.", "/typing"),
            t("Vocabulary drills", 30, "Homework sahifasidagi drill'larni qayta yeching.", "/homework"),
            t("Speaking with new words", 20, "Emma bilan suhbatda kamida 5 ta yangi so'zni ishlating.", "/speaking"),
        ],
        "wednesday": [
            t("Reading practice", 45, "AI tayyorlagan matnni o'qing va 6 ta savolga javob bering.", "/reading"),
            t("Listening (shadowing)", 35, "Matnni 'Listen' tugmasi orqali tinglang va gapma-gap takrorlang.", "/reading"),
            t("Glossary to SRS", 20, "Matndagi notanish so'zlarni lug'atga qo'shing.", "/vocabulary"),
            t("Weak spots", 20, "Reading bo'limidagi xatolarni ko'rib chiqing.", "/weak-spots"),
        ],
        "thursday": [
            t("Lesson-topic speaking", 40, "Speaking Room → 'My lessons' mavzusi: oxirgi 3 dars grammatikasida gapiring.", "/speaking"),
            t("Role-play", 30, "Cafe yoki Travel role-play: real hayotiy vaziyat.", "/speaking"),
            t("Correction drill", 25, "Suhbatdagi tuzatishlarni Weak Spots'da qayta o'qing va ovoz chiqarib ayting.", "/weak-spots"),
            t("Exam-style speaking", 25, "'Exam' rejimida 5 ta savolga to'liq javob bering.", "/speaking"),
        ],
        "friday": [
            t("Weekly Mock Test", 50, "3 ta uy ishi bo'yicha 25 savollik testni vaqt bilan ishlang.", "/exam"),
            t("Mistake analysis", 35, "Har bir xatoning tushuntirishini o'qing — 'nima uchun?' savoliga javob toping.", "/exam"),
            t("AI repair lesson", 35, "Weak Spots → 'AI Repair Lesson' tugmasi, 5 ta mashqni yeching.", "/weak-spots"),
        ],
        "saturday": [
            t("SRS review", 25, "Qolgan so'zlarni takrorlang.", "/vocabulary"),
            t("Light speaking", 20, "Erkin mavzuda 10 daqiqa suhbat.", "/speaking"),
            t("Weak spots", 15, "3 ta eng ko'p takrorlangan xatoni ko'rib chiqing.", "/weak-spots"),
        ],
        "sunday": [
            t("Optional free talk", 30, "Dam oling yoki Emma bilan 30 daqiqa erkin gaplashing.", "/speaking"),
        ],
    }
    return {
        "days": {k: {"theme": DAY_THEMES[k][0], "tasks": v} for k, v in days.items()},
        "motivation_uz": "Har kuni 2 soat — haftalik testdagi g'alabaning kaliti! 💪",
        "source": "default",
    }


def _due_count(db: Session, user: User) -> int:
    return db.query(Vocabulary).filter(Vocabulary.user_id == user.id, Vocabulary.next_review_date <= date.today()).count()


def _get_or_create_plan(db: Session, user: User) -> StudyPlan:
    ws = week_start()
    plan = db.query(StudyPlan).filter_by(user_id=user.id, week_start=ws).order_by(StudyPlan.id.desc()).first()
    if not plan:
        plan = StudyPlan(user_id=user.id, week_start=ws, plan=default_plan(_due_count(db, user)), completed={})
        db.add(plan)
        db.commit()
        db.refresh(plan)
    return plan


def plan_out(p: StudyPlan) -> dict:
    return {
        "id": p.id,
        "week_start": p.week_start.isoformat(),
        "today": today_key(),
        "days_order": WEEKDAY_KEYS,
        "plan": p.plan,
        "completed": p.completed or {},
    }


@router.get("/week")
def get_week(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return plan_out(_get_or_create_plan(db, user))


@router.get("/today")
def get_today(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = _get_or_create_plan(db, user)
    key = today_key()
    return {"day": key, **p.plan["days"].get(key, {}), "completed": (p.completed or {}).get(key, []), "study_time": user.study_time}


@router.post("/generate")
async def generate_plan(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hws = db.query(Homework).filter_by(user_id=user.id).order_by(Homework.homework_number.desc()).limit(3).all()
    weak = db.query(WeakSpot).filter_by(user_id=user.id, resolved=False).order_by(WeakSpot.times_wrong.desc()).limit(6).all()
    unused = db.query(Homework).filter(Homework.user_id == user.id, Homework.mock_test_id.is_(None)).count()
    per = get_settings().homeworks_per_mock
    data = await ai.generate_json(
        prompts.TEACHER_PERSONA,
        prompts.PLANNER.format(
            level=user.level, study_time=user.study_time,
            topics=", ".join(h.topic_name for h in hws) or "(none yet)",
            due_words=_due_count(db, user),
            total_words=db.query(Vocabulary).filter_by(user_id=user.id).count(),
            weak="; ".join(f"{w.topic} ({w.times_wrong}x)" for w in weak) or "(none)",
            until_mock=max(0, per - unused),
        ),
    )
    days = data.get("days") if isinstance(data, dict) else None
    if not isinstance(days, dict) or not all(k in days for k in WEEKDAY_KEYS[:5]):
        raise HTTPException(502, "AI reja formatini buzdi, qayta urinib ko'ring")
    base = default_plan(0)["days"]
    for k in WEEKDAY_KEYS:
        if k not in days or not days[k].get("tasks"):
            days[k] = base[k]
    plan = StudyPlan(
        user_id=user.id, week_start=week_start(),
        plan={"days": days, "motivation_uz": data.get("motivation_uz", ""), "source": "ai"}, completed={},
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan_out(plan)


@router.post("/reset")
def reset_plan(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plan = StudyPlan(user_id=user.id, week_start=week_start(), plan=default_plan(_due_count(db, user)), completed={})
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan_out(plan)


@router.post("/toggle")
def toggle_task(body: PlanTaskToggle, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = _get_or_create_plan(db, user)
    completed = {k: list(v) for k, v in (p.completed or {}).items()}
    done = set(completed.get(body.day, []))
    awarded = set(completed.get("_awarded", []))  # XP faqat bir marta beriladi
    key = f"{body.day}:{body.task_index}"
    xp = 0
    if body.task_index in done:
        done.remove(body.task_index)
    else:
        done.add(body.task_index)
        if key not in awarded:
            task = p.plan["days"].get(body.day, {}).get("tasks", [])[body.task_index:body.task_index + 1]
            minutes = task[0].get("minutes", 0) if task else 0
            xp = award_xp(db, user, "task_completed", minutes=minutes)
            awarded.add(key)
    completed[body.day] = sorted(done)
    completed["_awarded"] = sorted(awarded)
    p.completed = completed  # JSON maydon qayta tayinlanadi (mutatsiya kuzatilmaydi)
    db.commit()
    return {**plan_out(p), "xp_earned": xp}


# ---------------------------------------------------------------- Notifications

@router.post("/notify/test")
async def test_notification(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not get_settings().telegram_bot_token:
        raise HTTPException(400, "TELEGRAM_BOT_TOKEN .env faylida ko'rsatilmagan")
    if not user.telegram_chat_id:
        raise HTTPException(400, "Telegram chat ID ulanmagan. Botga /start yozing va 'Ulash' tugmasini bosing.")
    ok = await send_telegram(user.telegram_chat_id, build_reminder(user.name, _due_count(db, user)))
    if not ok:
        raise HTTPException(502, "Telegram xabar yuborilmadi — token yoki chat ID ni tekshiring")
    return {"ok": True}


@router.post("/notify/link-telegram")
async def link_telegram(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not get_settings().telegram_bot_token:
        raise HTTPException(400, "TELEGRAM_BOT_TOKEN .env faylida ko'rsatilmagan")
    chat_id = await find_latest_chat_id()
    if not chat_id:
        raise HTTPException(404, "Botga hali xabar yozilmagan. Telegramda botingizni ochib /start yozing, so'ng qayta bosing.")
    user.telegram_chat_id = chat_id
    db.commit()
    await send_telegram(chat_id, f"✅ EduPrep AI ulandi! Har kuni soat {user.study_time} da dars eslatmasini yuboraman.")
    return {"telegram_chat_id": chat_id}


@router.post("/telegram/webhook")
async def telegram_webhook(update: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Serverga deploy qilinganda: setWebhook orqali shu URL ulanadi. /start yozilsa chat_id saqlanadi."""
    msg = update.get("message") or {}
    chat_id = (msg.get("chat") or {}).get("id")
    text = (msg.get("text") or "").strip()
    if chat_id and text.startswith("/start"):
        user.telegram_chat_id = str(chat_id)
        db.commit()
        await send_telegram(str(chat_id), "✅ Ulandingiz! Dars vaqtida eslatma yuboraman. /today — bugungi reja.")
    elif chat_id and text.startswith("/today"):
        p = _get_or_create_plan(db, user)
        day = p.plan["days"].get(today_key(), {})
        lines = "\n".join(f"• {t['title']} — {t['minutes']} daq" for t in day.get("tasks", []))
        await send_telegram(str(chat_id), f"📅 <b>{day.get('theme', '')}</b>\n{lines}")
    return {"ok": True}
