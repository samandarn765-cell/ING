from sqlalchemy.orm import Session

from ..models import User, WeakSpot


def add_weak_spot(
    db: Session,
    user: User,
    *,
    source: str,
    question: str,
    user_answer: str = "",
    correct_answer: str = "",
    explanation: str = "",
    topic: str = "General",
    section: str = "grammar",
    source_id: int | None = None,
) -> WeakSpot:
    """Bir xil savol qayta xato qilinsa yangi yozuv emas, times_wrong oshiriladi."""
    existing = (
        db.query(WeakSpot)
        .filter(WeakSpot.user_id == user.id, WeakSpot.question == question)
        .first()
    )
    if existing:
        existing.times_wrong += 1
        existing.resolved = False
        existing.user_answer = user_answer
        return existing
    ws = WeakSpot(
        user_id=user.id,
        source=source,
        source_id=source_id,
        topic=topic or "General",
        section=section,
        question=question,
        user_answer=user_answer,
        correct_answer=correct_answer,
        explanation=explanation,
    )
    db.add(ws)
    return ws


def grade_drills(drills: list[dict], answers: dict[str, str]) -> dict:
    """Drill to'plamini tekshiradi; natija + har bir drill bo'yicha izoh."""
    from .checking import check_drill

    items = {}
    correct = 0
    for d in drills:
        did = str(d.get("id"))
        ua = answers.get(did, "")
        ok = check_drill(d, ua)
        correct += ok
        items[did] = {
            "correct": ok,
            "user_answer": ua,
            "answer": d.get("answer", ""),
            "accepted_answers": d.get("accepted_answers", []),
            "explanation_uz": d.get("explanation_uz", ""),
        }
    return {"score": correct, "total": len(drills), "items": items}
