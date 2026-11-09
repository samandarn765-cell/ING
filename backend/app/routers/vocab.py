"""Lug'at + SM-2 SRS + Mnemonika."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Vocabulary
from ..schemas import VocabCreate, VocabReview, VocabUpdate
from ..serializers import vocab_out
from ..services import prompts
from ..services.ai_service import AIError, ai
from ..services.gamification import award_xp
from ..services.srs_service import apply_sm2
from .homework import enrich_words, save_words

router = APIRouter(prefix="/api/vocab", tags=["Vocabulary"])


def _get(db: Session, user: User, vid: int) -> Vocabulary:
    v = db.query(Vocabulary).filter_by(id=vid, user_id=user.id).first()
    if not v:
        raise HTTPException(404, "So'z topilmadi")
    return v


@router.get("")
def list_words(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    words = db.query(Vocabulary).filter_by(user_id=user.id).order_by(Vocabulary.created_at.desc()).all()
    return [vocab_out(v) for v in words]


@router.get("/due")
def due_words(limit: int = 30, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    words = (
        db.query(Vocabulary)
        .filter(Vocabulary.user_id == user.id, Vocabulary.next_review_date <= date.today())
        .order_by(Vocabulary.next_review_date, Vocabulary.ease_factor)
        .limit(limit).all()
    )
    return [vocab_out(v) for v in words]


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    words = db.query(Vocabulary).filter_by(user_id=user.id).all()
    out = {"total": len(words), "new": 0, "learning": 0, "reviewing": 0, "mastered": 0,
           "due": sum(1 for w in words if w.next_review_date <= date.today())}
    for w in words:
        out[vocab_out(w)["mastery"]] += 1
    return out


@router.post("")
async def add_words(body: VocabCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        enriched = await enrich_words(user, body.words, "general")
    except AIError:
        enriched = []
        for line in body.words.splitlines():
            if line.strip():
                parts = [p.strip() for p in line.split("-", 1)]
                enriched.append({"word": parts[0], "translation_uz": parts[1] if len(parts) > 1 else ""})
    saved = save_words(db, user, enriched, None)
    award_xp(db, user, "word_added", multiplier=len(saved))
    db.commit()
    return [vocab_out(v) for v in saved]


@router.post("/{vid}/review")
def review(vid: int, body: VocabReview, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    v = _get(db, user, vid)
    apply_sm2(v, body.quality)
    xp = award_xp(db, user, "word_review", words_reviewed=1)
    db.commit()
    return {**vocab_out(v), "xp_earned": xp}


@router.patch("/{vid}")
def update_word(vid: int, body: VocabUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    v = _get(db, user, vid)
    for k, val in body.model_dump(exclude_none=True).items():
        setattr(v, k, val)
    db.commit()
    return vocab_out(v)


@router.post("/{vid}/mnemonics")
async def new_mnemonics(vid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    v = _get(db, user, vid)
    data = await ai.generate_json(
        prompts.TEACHER_PERSONA,
        prompts.MNEMONIC_ONE.format(word=v.word, meaning=v.translation_uz or v.definition_en),
        temperature=0.95,
    )
    return {"mnemonics": data.get("mnemonics", []) if isinstance(data, dict) else []}


@router.delete("/{vid}")
def delete_word(vid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_get(db, user, vid))
    db.commit()
    return {"ok": True}
