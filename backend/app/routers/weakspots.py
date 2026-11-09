"""Weak Spots — xatolar daftarchasi va AI "repair lesson"."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import PracticeSet, User, WeakSpot
from ..schemas import DrillSubmit
from ..serializers import public_drills, weakspot_out
from ..services import prompts
from ..services.ai_service import ai
from ..services.checking import shuffle_drill_options
from ..services.gamification import award_xp
from ..services.weakspots import grade_drills

router = APIRouter(prefix="/api/weak-spots", tags=["Weak Spots"])


@router.get("")
def list_spots(include_resolved: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(WeakSpot).filter_by(user_id=user.id)
    if not include_resolved:
        q = q.filter_by(resolved=False)
    return [weakspot_out(w) for w in q.order_by(WeakSpot.times_wrong.desc(), WeakSpot.created_at.desc()).all()]


@router.post("/{ws_id}/resolve")
def resolve(ws_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ws = db.query(WeakSpot).filter_by(id=ws_id, user_id=user.id).first()
    if not ws:
        raise HTTPException(404, "Topilmadi")
    if not ws.resolved:
        ws.resolved = True
        award_xp(db, user, "weakspot_resolved")
    db.commit()
    return weakspot_out(ws)


@router.delete("/{ws_id}")
def delete_spot(ws_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ws = db.query(WeakSpot).filter_by(id=ws_id, user_id=user.id).first()
    if ws:
        db.delete(ws)
        db.commit()
    return {"ok": True}


@router.post("/review")
async def repair_lesson(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    spots = (
        db.query(WeakSpot).filter_by(user_id=user.id, resolved=False)
        .order_by(WeakSpot.times_wrong.desc(), WeakSpot.created_at.desc()).limit(15).all()
    )
    if not spots:
        raise HTTPException(400, "Xatolar daftarchasi bo'sh — ajoyib! 🎉")
    items = "\n".join(
        f"- [{w.section}/{w.topic}] Q: {w.question[:160]} | student: {w.user_answer[:80]} | correct: {w.correct_answer[:80]} (wrong {w.times_wrong}x)"
        for w in spots
    )
    data = await ai.generate_json(prompts.TEACHER_PERSONA, prompts.WEAKSPOT_REVIEW.format(level=user.level, items=items))
    drills = data.get("drills", []) or []
    for i, d in enumerate(drills, 1):
        d["id"] = i
    data["drills"] = shuffle_drill_options(drills)
    ps = PracticeSet(user_id=user.id, kind="weakspot_review", payload={**data, "spot_ids": [w.id for w in spots]})
    db.add(ps)
    db.commit()
    return {
        "practice_id": ps.id,
        "summary_uz": data.get("summary_uz", ""),
        "patterns": data.get("patterns", []),
        "drills": public_drills(drills),
    }


@router.post("/review/{practice_id}/check")
def check_review(practice_id: int, body: DrillSubmit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ps = db.query(PracticeSet).filter_by(id=practice_id, user_id=user.id, kind="weakspot_review").first()
    if not ps:
        raise HTTPException(404, "Mashq topilmadi")
    result = grade_drills(ps.payload.get("drills", []), body.answers)
    first_time = ps.result is None
    result["xp_earned"] = award_xp(db, user, "drill_correct", multiplier=result["score"]) if first_time else 0
    ps.result = result
    db.commit()
    return result
