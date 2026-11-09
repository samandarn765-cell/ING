"""2-modul: 3-Homework Pre-Test Simulator (Weekly Mock Test)."""
import copy
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Homework, MockTest, User, Vocabulary, WeakSpot
from ..schemas import MockSubmit
from ..serializers import mock_detail, mock_out
from ..services import prompts
from ..services.ai_service import AIError, ai
from ..services.checking import shuffle_mcq
from ..services.gamification import award_xp
from ..services.weakspots import add_weak_spot

router = APIRouter(prefix="/api/mock-tests", tags=["Mock Test"])

SECTIONS = {
    "grammar": "Grammar",
    "error_spotting": "Error Spotting",
    "vocabulary": "Vocabulary in Context",
    "reading": "Reading & Gap Filling",
}


def _unused_homeworks(db: Session, user: User) -> list[Homework]:
    return (
        db.query(Homework).filter(Homework.user_id == user.id, Homework.mock_test_id.is_(None))
        .order_by(Homework.homework_number).all()
    )


@router.get("/status")
def mock_status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    per = get_settings().homeworks_per_mock
    unused = _unused_homeworks(db, user)
    pending = db.query(MockTest).filter_by(user_id=user.id, status="pending").order_by(MockTest.id.desc()).first()
    total_hw = db.query(Homework).filter_by(user_id=user.id).count()
    return {
        "homeworks_per_mock": per,
        "progress": min(len(unused), per),
        "unlocked": len(unused) >= per,
        "remaining": max(0, per - len(unused)),
        "next_homeworks": [{"id": h.id, "number": h.homework_number, "topic": h.topic_name} for h in unused[:per]],
        "pending_test_id": pending.id if pending else None,
        "total_homeworks": total_hw,
    }


def _validate_questions(raw: list) -> list[dict]:
    valid = []
    for q in raw or []:
        opts = q.get("options")
        idx = q.get("correct_index")
        if not isinstance(opts, list) or len(opts) < 2 or not isinstance(idx, int) or not 0 <= idx < len(opts):
            continue
        if q.get("section") not in SECTIONS:
            q["section"] = "grammar"
        q["options"] = [str(o) for o in opts]
        valid.append(shuffle_mcq(q))
    order = list(SECTIONS)
    valid.sort(key=lambda q: (order.index(q["section"]), q.get("id", 0)))
    for i, q in enumerate(valid, 1):
        q["id"] = i
    return valid


async def _generate(db: Session, user: User, hws: list[Homework]) -> dict:
    lessons = "\n".join(
        f"- Homework #{h.homework_number}: {h.topic_name}. Grammar: {h.grammar_points or '-'}."
        + (f" Key rules: {(h.explanation or {}).get('when_to_use_uz', '')}" if h.explanation else "")
        for h in hws
    )
    words = db.query(Vocabulary).filter(Vocabulary.homework_id.in_([h.id for h in hws])).all()
    vocab = ", ".join(w.word for w in words) or "(use topic-appropriate B1-B2 vocabulary)"
    weak = (
        db.query(WeakSpot).filter_by(user_id=user.id, resolved=False)
        .order_by(WeakSpot.times_wrong.desc()).limit(6).all()
    )
    weak_txt = "; ".join(f"{w.topic}: {w.question[:80]}" for w in weak) or "(none yet)"

    prompt = prompts.MOCK_TEST.format(level=user.level, lessons=lessons, vocab=vocab, weak=weak_txt)
    for _ in range(2):
        data = await ai.generate_json(prompts.TEACHER_PERSONA, prompt, temperature=0.7)
        questions = _validate_questions(data.get("questions", []) if isinstance(data, dict) else [])
        if len(questions) >= 20:
            return {"title": data.get("title") or "Weekly Mock Test", "reading_passage": data.get("reading_passage", ""), "questions": questions}
    raise AIError("AI to'liq test yarata olmadi. Qayta urinib ko'ring.", 502)


@router.post("")
async def create_mock(force: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    per = get_settings().homeworks_per_mock
    unused = _unused_homeworks(db, user)
    consume = True
    if len(unused) >= per:
        hws = unused[:per]
    elif force:
        hws = db.query(Homework).filter_by(user_id=user.id).order_by(Homework.homework_number.desc()).limit(per).all()
        consume = False  # mashq testi — uy ishlari "sarflanmaydi"
        if not hws:
            raise HTTPException(400, "Avval kamida 1 ta uy vazifasini kiriting")
    else:
        raise HTTPException(400, f"Mock test {per} ta uy vazifasidan so'ng ochiladi. Yana {per - len(unused)} ta kerak.")

    gen = await _generate(db, user, hws)
    mock = MockTest(
        user_id=user.id,
        title=gen["title"] + ("" if consume else " (Practice)"),
        based_on_homework_ids=[h.id for h in hws],
        reading_passage=gen["reading_passage"],
        questions=gen["questions"],
        total_questions=len(gen["questions"]),
        status="pending",
    )
    db.add(mock)
    db.flush()
    if consume:
        for h in hws:
            h.mock_test_id = mock.id
    db.commit()
    db.refresh(mock)
    return mock_detail(mock)


@router.get("")
def list_mocks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [mock_out(m) for m in db.query(MockTest).filter_by(user_id=user.id).order_by(MockTest.id.desc()).all()]


def _get_mock(db: Session, user: User, mock_id: int) -> MockTest:
    m = db.query(MockTest).filter_by(id=mock_id, user_id=user.id).first()
    if not m:
        raise HTTPException(404, "Test topilmadi")
    return m


@router.get("/{mock_id}")
def get_mock(mock_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return mock_detail(_get_mock(db, user, mock_id))


@router.post("/{mock_id}/submit")
async def submit_mock(mock_id: int, body: MockSubmit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    m = _get_mock(db, user, mock_id)
    if m.status == "completed":
        raise HTTPException(400, "Bu test allaqachon topshirilgan")

    sections = {s: {"correct": 0, "total": 0, "label": label} for s, label in SECTIONS.items()}
    mistakes = []
    score = 0
    for q in m.questions:
        sec = sections[q["section"]]
        sec["total"] += 1
        chosen = body.answers.get(str(q["id"]))
        if chosen == q["correct_index"]:
            sec["correct"] += 1
            score += 1
            continue
        user_ans = q["options"][chosen] if isinstance(chosen, int) and 0 <= chosen < len(q["options"]) else "(javob berilmagan)"
        correct = q["options"][q["correct_index"]]
        if q.get("correct_version"):
            correct = f"{correct} → {q['correct_version']}"
        mistakes.append((q, user_ans, correct))
        add_weak_spot(
            db, user, source="mock_test", source_id=m.id, topic=q.get("topic", "General"), section=q["section"],
            question=q["question"] if q["section"] != "reading" or q["id"] > 23 else f"{q['question']} (Reading passage)",
            user_answer=user_ans, correct_answer=correct, explanation=q.get("explanation_uz", ""),
        )

    m.answers = {k: v for k, v in body.answers.items()}
    m.score = score
    m.section_scores = {k: v for k, v in sections.items() if v["total"]}
    m.time_spent_sec = body.time_spent_sec
    m.status = "completed"
    m.completed_at = datetime.utcnow()
    topic_counter = Counter(q.get("topic", "General") for q, _, _ in mistakes)
    m.weak_topics = [t for t, _ in topic_counter.most_common(5)]

    try:
        fb = await ai.generate_json(
            prompts.TEACHER_PERSONA,
            prompts.TEST_FEEDBACK.format(
                score=score, total=m.total_questions,
                sections=", ".join(f"{v['label']}: {v['correct']}/{v['total']}" for v in m.section_scores.values()),
                mistakes="\n".join(f"{q.get('topic')} | {q['question'][:120]} | {ua} | {c}" for q, ua, c in mistakes) or "No mistakes!",
            ),
            temperature=0.6,
        )
        steps = "\n".join(f"- {s}" for s in fb.get("next_steps_uz", []))
        m.ai_feedback = fb.get("feedback_uz", "") + (f"\n\n**Keyingi qadamlar:**\n{steps}" if steps else "")
        if fb.get("weak_topics"):
            m.weak_topics = fb["weak_topics"]
    except AIError:
        pct = round(score * 100 / max(1, m.total_questions))
        m.ai_feedback = f"Natija: **{pct}%**. Xatolar 'Weak Spots' bo'limiga saqlandi — ularni takrorlang."

    xp = award_xp(db, user, "mock_correct", multiplier=score) + award_xp(db, user, "mock_completed")
    if score == m.total_questions:
        xp += award_xp(db, user, "mock_perfect_bonus")
    db.commit()
    db.refresh(m)
    out = mock_detail(m)
    out["xp_earned"] = xp
    return out


@router.post("/{mock_id}/retake")
def retake_mock(mock_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    src = _get_mock(db, user, mock_id)
    questions = [shuffle_mcq(copy.deepcopy(q)) for q in src.questions]
    m = MockTest(
        user_id=user.id, title=src.title.replace(" (Retake)", "") + " (Retake)",
        based_on_homework_ids=src.based_on_homework_ids, reading_passage=src.reading_passage,
        questions=questions, total_questions=len(questions), status="pending",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return mock_detail(m)


@router.delete("/{mock_id}")
def delete_mock(mock_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    m = _get_mock(db, user, mock_id)
    for h in db.query(Homework).filter_by(mock_test_id=m.id).all():
        h.mock_test_id = None  # uy ishlari yana keyingi test uchun bo'shaydi
    db.delete(m)
    db.commit()
    return {"ok": True}
