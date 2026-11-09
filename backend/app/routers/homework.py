"""1-modul: Smart Homework Explainer & Topic Tracker."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import ChatMessage, Homework, User, Vocabulary
from ..schemas import DrillSubmit, FollowUpQuestion, HomeworkCreate
from ..serializers import homework_out
from ..services import prompts
from ..services.ai_service import AIError, ai
from ..services.checking import shuffle_drill_options
from ..services.gamification import award_xp
from ..services.weakspots import add_weak_spot, grade_drills

router = APIRouter(prefix="/api/homeworks", tags=["Homework"])


def _get_hw(db: Session, user: User, hw_id: int) -> Homework:
    hw = db.query(Homework).filter_by(id=hw_id, user_id=user.id).first()
    if not hw:
        raise HTTPException(404, "Uy vazifasi topilmadi")
    return hw


async def _generate_explanation(user: User, hw: Homework) -> dict:
    prompt = prompts.HOMEWORK_EXPLAIN.format(
        level=user.level,
        number=hw.homework_number,
        topic=hw.topic_name,
        grammar=hw.grammar_points or "(not specified — infer from the topic)",
        vocab=hw.vocabulary_raw.replace("\n", "; ") or "(none)",
        questions=hw.questions or "(none)",
    )
    data = await ai.generate_json(prompts.TEACHER_PERSONA, prompt, temperature=0.6)
    if not isinstance(data, dict):
        raise AIError("AI tushuntirish formatini buzdi", 502)
    return data


async def enrich_words(user: User, raw: str, topic: str) -> list[dict]:
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    if not lines:
        return []
    data = await ai.generate_json(
        prompts.TEACHER_PERSONA,
        prompts.VOCAB_ENRICH.format(level=user.level, topic=topic, raw="\n".join(lines)),
        temperature=0.8,
    )
    return data.get("words", []) if isinstance(data, dict) else []


def save_words(db: Session, user: User, words: list[dict], homework_id: int | None) -> list[Vocabulary]:
    saved = []
    for w in words:
        word = (w.get("word") or "").strip()
        if not word:
            continue
        exists = db.query(Vocabulary).filter(Vocabulary.user_id == user.id, Vocabulary.word.ilike(word)).first()
        if exists:
            continue
        v = Vocabulary(
            user_id=user.id,
            homework_id=homework_id,
            word=word,
            part_of_speech=w.get("part_of_speech", "")[:30],
            translation_uz=w.get("translation_uz", ""),
            definition_en=w.get("definition_en", ""),
            example_sentence=w.get("example_sentence", ""),
            mnemonic=w.get("mnemonic_uz", ""),
        )
        db.add(v)
        saved.append(v)
    return saved


def _apply_explanation(hw: Homework, data: dict) -> None:
    drills = data.pop("drills", []) or []
    for i, d in enumerate(drills, 1):
        d["id"] = i
    hw.drills = shuffle_drill_options(drills)
    hw.explanation = data
    hw.drill_results = None


@router.get("")
def list_homeworks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hws = db.query(Homework).filter_by(user_id=user.id).order_by(Homework.homework_number.desc()).all()
    return [homework_out(h, full=False) for h in hws]


@router.post("")
async def create_homework(body: HomeworkCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    last = db.query(Homework).filter_by(user_id=user.id).order_by(Homework.homework_number.desc()).first()
    number = body.homework_number or ((last.homework_number + 1) if last else 1)
    hw = Homework(
        user_id=user.id,
        homework_number=number,
        topic_name=body.topic_name.strip(),
        grammar_points=body.grammar_points.strip(),
        vocabulary_raw=body.vocabulary_raw.strip(),
        questions=body.questions.strip(),
    )
    db.add(hw)
    db.flush()

    ai_error = None
    results = await asyncio.gather(
        _generate_explanation(user, hw),
        enrich_words(user, hw.vocabulary_raw, hw.topic_name),
        return_exceptions=True,
    )
    explanation, words = results
    if isinstance(explanation, Exception):
        ai_error = getattr(explanation, "message", str(explanation))
    else:
        _apply_explanation(hw, explanation)
    if isinstance(words, Exception):
        ai_error = ai_error or getattr(words, "message", str(words))
        # AI ishlamasa ham so'zlarni foydalanuvchi yozgan ko'rinishda saqlaymiz
        words = []
        for line in hw.vocabulary_raw.splitlines():
            if line.strip():
                parts = [p.strip() for p in line.replace("—", "-").split("-", 1)]
                words.append({"word": parts[0], "translation_uz": parts[1] if len(parts) > 1 else ""})
    saved = save_words(db, user, words, hw.id)
    xp = award_xp(db, user, "homework_added") + award_xp(db, user, "word_added", multiplier=len(saved))
    db.commit()
    db.refresh(hw)
    out = homework_out(hw)
    out["ai_error"] = ai_error
    out["xp_earned"] = xp
    return out


@router.get("/{hw_id}")
def get_homework(hw_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return homework_out(_get_hw(db, user, hw_id))


@router.post("/{hw_id}/regenerate")
async def regenerate(hw_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hw = _get_hw(db, user, hw_id)
    _apply_explanation(hw, await _generate_explanation(user, hw))
    db.commit()
    db.refresh(hw)
    return homework_out(hw)


@router.delete("/{hw_id}")
def delete_homework(hw_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hw = _get_hw(db, user, hw_id)
    db.delete(hw)
    db.commit()
    return {"ok": True}


@router.post("/{hw_id}/drills/check")
def check_drills(hw_id: int, body: DrillSubmit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hw = _get_hw(db, user, hw_id)
    if not hw.drills:
        raise HTTPException(400, "Bu uy vazifasida mashqlar yo'q")
    result = grade_drills(hw.drills, body.answers)

    # XP faqat birinchi marta to'g'ri yechilgan drill uchun (XP "farm" qilishning oldini olish)
    prev_awarded = set((hw.drill_results or {}).get("xp_awarded_ids", []))
    newly = [did for did, r in result["items"].items() if r["correct"] and did not in prev_awarded]
    xp = award_xp(db, user, "drill_correct", multiplier=len(newly)) if newly else 0
    result["xp_awarded_ids"] = sorted(prev_awarded | set(newly))
    result["xp_earned"] = xp

    by_id = {str(d["id"]): d for d in hw.drills}
    for did, r in result["items"].items():
        if not r["correct"] and r["user_answer"]:
            d = by_id[did]
            add_weak_spot(
                db, user, source="drill", source_id=hw.id, topic=hw.topic_name, section="grammar",
                question=f"{d.get('instruction_en', '')} {d.get('question', '')}".strip(),
                user_answer=r["user_answer"], correct_answer=d.get("answer", ""),
                explanation=d.get("explanation_uz", ""),
            )
    hw.drill_results = result
    db.commit()
    return result


@router.post("/{hw_id}/ask")
async def ask_followup(hw_id: int, body: FollowUpQuestion, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hw = _get_hw(db, user, hw_id)
    session_id = f"hw-{hw.id}"
    history = (
        db.query(ChatMessage).filter_by(user_id=user.id, session_id=session_id)
        .order_by(ChatMessage.id.desc()).limit(10).all()
    )
    messages = [{"role": m.message_role, "content": m.message_content} for m in reversed(history)]
    messages.append({"role": "user", "content": body.question})
    system = prompts.TEACHER_PERSONA + "\n\n" + prompts.HOMEWORK_FOLLOWUP.format(
        number=hw.homework_number, topic=hw.topic_name, grammar=hw.grammar_points or "-"
    )
    answer = await ai.chat(system, messages, temperature=0.5)
    for role, content in (("user", body.question), ("assistant", answer)):
        db.add(ChatMessage(user_id=user.id, session_id=session_id, mode="homework_explainer",
                           message_role=role, message_content=content))
    db.commit()
    return {"answer": answer}


@router.get("/{hw_id}/chat")
def followup_history(hw_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_hw(db, user, hw_id)
    msgs = db.query(ChatMessage).filter_by(user_id=user.id, session_id=f"hw-{hw_id}").order_by(ChatMessage.id).all()
    return [{"role": m.message_role, "content": m.message_content} for m in msgs]
