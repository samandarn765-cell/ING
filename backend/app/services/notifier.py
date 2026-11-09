"""Telegram Bot orqali eslatmalar va kunlik reja matnlari."""
import logging
from datetime import date

import httpx

from ..config import get_settings

log = logging.getLogger("notifier")

WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

DAY_THEMES = {
    "monday": ("⌨️ Typing & Sentence Building", "Bugun tez gap tuzish kuni! Oxirgi mavzular bo'yicha gaplarni yozib mashq qilamiz."),
    "tuesday": ("🧠 Vocabulary Drills (SRS)", "Bugun Vocabulary kuni — takrorlash vaqti kelgan so'zlarni yangilaymiz!"),
    "wednesday": ("📖 Reading & Listening", "Bugun o'qish va tinglash kuni. Matn + savollar seni kutmoqda."),
    "thursday": ("🎙 Active Speaking", "Bugun Speaking kuni! Emma bilan 30 daqiqa suhbatlashamiz."),
    "friday": ("🎯 Mock Test & Xatolar", "Juma — test kuni! Mock test va xatolar ustida ishlash."),
    "saturday": ("🔁 Yengil takrorlash", "Shanba: 1 soatlik yengil takrorlash."),
    "sunday": ("🌿 Dam olish", "Yakshanba: dam ol yoki 30 daqiqa erkin suhbat qil."),
}


def today_key(d: date | None = None) -> str:
    return WEEKDAY_KEYS[(d or date.today()).weekday()]


def build_reminder(name: str, due_words: int, d: date | None = None) -> str:
    title, text = DAY_THEMES[today_key(d)]
    extra = f"\n📚 Bugun takrorlash kerak bo'lgan so'zlar: <b>{due_words}</b> ta." if due_words else ""
    return f"⏰ <b>{name}, dars vaqting bo'ldi!</b>\n\n{title}\n{text}{extra}\n\n2 soat — va sen haftalik testga tayyor bo'lasan! 💪"


async def send_telegram(chat_id: str, text: str) -> bool:
    token = get_settings().telegram_bot_token
    if not token or not chat_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            )
        if r.status_code != 200:
            log.warning("Telegram xatosi: %s", r.text[:200])
        return r.status_code == 200
    except httpx.HTTPError as e:
        log.warning("Telegram ulanish xatosi: %s", e)
        return False


async def find_latest_chat_id() -> str | None:
    """Lokal ishlatishda webhook shart emas: foydalanuvchi botga /start yozadi,
    biz getUpdates orqali uning chat_id sini topamiz."""
    token = get_settings().telegram_bot_token
    if not token:
        return None
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"https://api.telegram.org/bot{token}/getUpdates")
    if r.status_code != 200:
        return None
    for upd in reversed(r.json().get("result", [])):
        msg = upd.get("message") or upd.get("edited_message")
        if msg and msg.get("chat", {}).get("id"):
            return str(msg["chat"]["id"])
    return None
