"""Typing & Sentence Building va Reading & Listening mashqlari."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Homework, PracticeSet, User, Vocabulary
from ..schemas import MockSubmit, PracticeResult
from ..services import prompts
from ..services.ai_service import ai
from ..services.gamification import award_xp
from ..services.weakspots import add_weak_spot

router = APIRouter(prefix="/api/practice", tags=["Practice"])


def _context(db: Session, user: User) -> tuple[str, str]:
    hws = db.query(Homework).filter_by(user_id=user.id).order_by(Homework.homework_number.desc()).limit(3).all()
    topics = ", ".join(h.topic_name for h in hws) or "Present Simple, Past Simple, Present Perfect"
    words = db.query(Vocabulary).filter_by(user_id=user.id).order_by(Vocabulary.next_review_date).limit(20).all()
    return topics, ", ".join(w.word for w in words) or "(everyday vocabulary)"


@router.post("/typing")
async def typing_set(count: int = 10, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topics, words = _context(db, user)
    data = await ai.generate_json(
        prompts.TEACHER_PERSONA,
        prompts.TYPING_SET.format(count=max(5, min(count, 15)), level=user.level, topics=topics, words=words),
    )
    items = [i for i in (data.get("items") or []) if i.get("en") and i.get("uz")]
    if not items:
        raise HTTPException(502, "AI gaplar yarata olmadi")
    ps = PracticeSet(user_id=user.id, kind="typing", payload={"items": items})
    db.add(ps)
    db.commit()
    return {"practice_id": ps.id, "items": items}


@router.post("/reading")
async def reading_set(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topics, words = _context(db, user)
    data = await ai.generate_json(prompts.TEACHER_PERSONA, prompts.READING_SET.format(level=user.level, topics=topics, words=words))
    questions = [q for q in data.get("questions", []) if isinstance(q.get("correct_index"), int) and q.get("options")]
    for i, q in enumerate(questions, 1):
        q["id"] = i
    data["questions"] = questions
    ps = PracticeSet(user_id=user.id, kind="reading", payload=data)
    db.add(ps)
    db.commit()
    hidden = {"correct_index", "explanation_uz"}
    return {
        "practice_id": ps.id, "title": data.get("title", "Reading"), "text": data.get("text", ""),
        "glossary": data.get("glossary", []),
        "questions": [{k: v for k, v in q.items() if k not in hidden} for q in questions],
    }


@router.post("/reading/{practice_id}/submit")
def reading_submit(practice_id: int, body: MockSubmit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ps = db.query(PracticeSet).filter_by(id=practice_id, user_id=user.id, kind="reading").first()
    if not ps:
        raise HTTPException(404, "Mashq topilmadi")
    results, correct = {}, 0
    for q in ps.payload.get("questions", []):
        chosen = body.answers.get(str(q["id"]))
        ok = chosen == q["correct_index"]
        correct += ok
        results[str(q["id"])] = {"correct": ok, "chosen": chosen, "correct_index": q["correct_index"],
                                 "explanation_uz": q.get("explanation_uz", "")}
        if not ok and isinstance(chosen, int) and 0 <= chosen < len(q["options"]):
            add_weak_spot(db, user, source="reading", source_id=ps.id, topic="Reading", section="reading",
                          question=f"{q['question']} ({ps.payload.get('title', '')})",
                          user_answer=q["options"][chosen], correct_answer=q["options"][q["correct_index"]],
                          explanation=q.get("explanation_uz", ""))
    xp = award_xp(db, user, "reading_correct", multiplier=correct) if ps.result is None else 0
    ps.result = {"score": correct, "total": len(results)}
    db.commit()
    return {"score": correct, "total": len(results), "results": results, "xp_earned": xp}


@router.post("/result")
def save_result(body: PracticeResult, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Typing natijasi frontendda hisoblanadi (aniqlik/WPM), bu yerda XP va daqiqalar yoziladi."""
    xp = award_xp(db, user, "typing_sentence", multiplier=max(0, min(body.correct, 30)), minutes=max(0, min(body.minutes, 180)))
    db.commit()
    return {"xp_earned": xp}
