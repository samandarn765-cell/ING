"""Dashboard, progress va sozlamalar."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user
from ..models import DailyActivity, Homework, MockTest, User, Vocabulary, WeakSpot
from ..schemas import SettingsUpdate
from ..serializers import homework_out, mock_out
from ..services.ai_service import ai
from ..services.gamification import effective_streak, level_info
from ..services.notifier import today_key
from .planner import _get_or_create_plan

router = APIRouter(prefix="/api", tags=["Dashboard"])


def user_out(u: User) -> dict:
    return {
        "id": u.id, "name": u.name, "level": u.level, "target_score": u.target_score,
        "xp": u.xp, "streak": effective_streak(u), "best_streak": u.best_streak,
        "study_time": u.study_time, "telegram_chat_id": u.telegram_chat_id,
        "notifications_enabled": u.notifications_enabled,
        **{"level_info": level_info(u.xp)},
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.put("/settings")
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for k, v in body.model_dump(exclude_none=True).items():
        if k == "telegram_chat_id":
            v = v.strip() or None
        elif isinstance(v, str) and not v.strip():
            continue
        setattr(user, k, v)
    db.commit()
    return user_out(user)


@router.get("/health")
def health():
    s = get_settings()
    return {
        "ok": True,
        "ai_provider": ai.provider,
        "ai_model": ai.model_name(),
        "ai_configured": ai.is_configured(),
        "telegram_configured": bool(s.telegram_bot_token),
    }


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = get_settings()
    today = date.today()
    hws = db.query(Homework).filter_by(user_id=user.id).order_by(Homework.homework_number.desc()).all()
    unused = [h for h in hws if h.mock_test_id is None]
    words = db.query(Vocabulary).filter_by(user_id=user.id).all()
    tests = db.query(MockTest).filter_by(user_id=user.id, status="completed").order_by(MockTest.completed_at).all()
    weak = db.query(WeakSpot).filter_by(user_id=user.id, resolved=False).count()

    acts = {a.day: a for a in db.query(DailyActivity).filter(
        DailyActivity.user_id == user.id, DailyActivity.day >= today - timedelta(days=27)).all()}
    heatmap = [
        {"date": (today - timedelta(days=i)).isoformat(), "xp": acts[today - timedelta(days=i)].xp_earned if (today - timedelta(days=i)) in acts else 0}
        for i in range(27, -1, -1)
    ]
    plan = _get_or_create_plan(db, user)
    tkey = today_key()
    today_plan = plan.plan["days"].get(tkey, {})
    today_done = (plan.completed or {}).get(tkey, [])
    today_act = acts.get(today)

    return {
        "user": user_out(user),
        "stats": {
            "homeworks": len(hws),
            "words_total": len(words),
            "words_due": sum(1 for w in words if w.next_review_date <= today),
            "words_mastered": sum(1 for w in words if w.interval >= 21),
            "tests_taken": len(tests),
            "avg_score": round(sum(t.score * 100 / t.total_questions for t in tests) / len(tests)) if tests else None,
            "weak_spots": weak,
            "today_xp": today_act.xp_earned if today_act else 0,
            "today_minutes": today_act.minutes if today_act else 0,
        },
        "mock": {
            "per": s.homeworks_per_mock,
            "progress": min(len(unused), s.homeworks_per_mock),
            "unlocked": len(unused) >= s.homeworks_per_mock,
            "pending_test_id": next((t.id for t in db.query(MockTest).filter_by(user_id=user.id, status="pending").order_by(MockTest.id.desc()).limit(1)), None),
        },
        "score_history": [{"id": t.id, "date": t.completed_at.date().isoformat(), "percent": round(t.score * 100 / t.total_questions)} for t in tests[-10:]],
        "heatmap": heatmap,
        "today": {"day": tkey, "theme": today_plan.get("theme", ""), "tasks": today_plan.get("tasks", []), "completed": today_done},
        "recent_homeworks": [homework_out(h, full=False) for h in hws[:4]],
        "recent_tests": [mock_out(t) for t in reversed(tests[-3:])],
    }
