"""APScheduler: har daqiqada tekshiradi — foydalanuvchining dars vaqti kelsa Telegram eslatma yuboradi."""
import logging
from datetime import date, datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from ..config import get_settings
from ..database import SessionLocal
from ..models import User, Vocabulary
from .notifier import build_reminder, send_telegram

log = logging.getLogger("scheduler")
scheduler = AsyncIOScheduler()
_sent_today: set[tuple[int, str]] = set()


async def reminder_job():
    settings = get_settings()
    now = datetime.now(ZoneInfo(settings.timezone))
    hhmm = now.strftime("%H:%M")
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.notifications_enabled.is_(True), User.telegram_chat_id.isnot(None)).all()
        for u in users:
            key = (u.id, now.date().isoformat())
            if u.study_time != hhmm or key in _sent_today:
                continue
            due = db.query(Vocabulary).filter(Vocabulary.user_id == u.id, Vocabulary.next_review_date <= date.today()).count()
            if await send_telegram(u.telegram_chat_id, build_reminder(u.name, due, now.date())):
                _sent_today.add(key)
                log.info("Eslatma yuborildi: user=%s", u.id)
    finally:
        db.close()


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(reminder_job, "cron", minute="*", id="reminder", replace_existing=True)
        scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
