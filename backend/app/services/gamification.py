"""XP, daraja (level) va streak (uzluksiz kunlar) mantiqi."""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from ..models import DailyActivity, User

XP_RULES = {
    "drill_correct": 10,
    "mock_correct": 5,
    "mock_completed": 50,
    "mock_perfect_bonus": 100,
    "word_review": 3,
    "word_added": 2,
    "speaking_turn": 4,
    "speaking_fixed": 6,  # tuzatilgan gapni to'g'ri qaytardi
    "homework_added": 20,
    "task_completed": 15,
    "typing_sentence": 3,
    "reading_correct": 5,
    "weakspot_resolved": 8,
}

LEVEL_TITLES = ["Beginner", "Explorer", "Builder", "Speaker", "Achiever", "Pro", "Master", "Legend"]


def level_info(xp: int) -> dict:
    """Har bir keyingi daraja oldingisidan biroz ko'proq XP talab qiladi."""
    level, need, acc = 1, 300, 0
    while xp >= acc + need:
        acc += need
        level += 1
        need = int(need * 1.25)
    return {
        "level": level,
        "title": LEVEL_TITLES[min(level - 1, len(LEVEL_TITLES) - 1)],
        "xp_in_level": xp - acc,
        "xp_for_next": need,
    }


def _touch_streak(user: User, today: date) -> None:
    if user.last_active_date == today:
        return
    if user.last_active_date == today - timedelta(days=1):
        user.streak += 1
    else:
        user.streak = 1
    user.best_streak = max(user.best_streak, user.streak)
    user.last_active_date = today


def get_today_activity(db: Session, user: User, today: date | None = None) -> DailyActivity:
    today = today or date.today()
    act = db.query(DailyActivity).filter_by(user_id=user.id, day=today).first()
    if not act:
        act = DailyActivity(user_id=user.id, day=today, xp_earned=0, words_reviewed=0, speaking_turns=0, minutes=0)
        db.add(act)
        db.flush()
    return act


def award_xp(db: Session, user: User, rule: str, multiplier: int = 1, **counters) -> int:
    """XP qo'shadi, streakni yangilaydi va bugungi faollikni yozadi. Qo'shilgan XP'ni qaytaradi."""
    amount = XP_RULES.get(rule, 0) * multiplier
    today = date.today()
    _touch_streak(user, today)
    user.xp += amount
    act = get_today_activity(db, user, today)
    act.xp_earned += amount
    for key, val in counters.items():
        setattr(act, key, (getattr(act, key) or 0) + val)
    return amount


def effective_streak(user: User) -> int:
    """Kecha ham, bugun ham faol bo'lmagan bo'lsa streak uzilgan hisoblanadi."""
    if not user.last_active_date:
        return 0
    if user.last_active_date >= date.today() - timedelta(days=1):
        return user.streak
    return 0
