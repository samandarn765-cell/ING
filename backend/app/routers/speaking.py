"""3-modul: Human-like AI Speaking Partner (Web Speech API bilan frontendda ishlaydi)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import ChatMessage, Homework, User
from ..schemas import SpeakingMessage, SpeakingStart
from ..services import prompts
from ..services.ai_service import ai
from ..services.gamification import award_xp
from ..services.weakspots import add_weak_spot

router = APIRouter(prefix="/api/speaking", tags=["Speaking"])

# session_id formati: "sp-<topic>-<hex>" — mavzu session_id ichida saqlanadi
GREETINGS = {
    "free": "Hi there! I'm Emma, your speaking partner. How has your day been so far?",
    "lessons": "Hey! Let's practise what you learned in your last lessons. Ready? Tell me — what did you do last weekend?",
    "cafe": "Hi, welcome to Bean & Leaf Café! What can I get for you today?",
    "interview": "Good afternoon, thanks for coming in! Could you start by telling me a little about yourself?",
    "travel": "Oh, hello! You look a bit lost. Can I help you find something?",
    "exam": "Hello! Let's start the speaking practice. First question: can you tell me about your hometown?",
}


def _lessons_context(db: Session, user: User) -> str:
    hws = db.query(Homework).filter_by(user_id=user.id).order_by(Homework.homework_number.desc()).limit(3).all()
    if not hws:
        return "(no lessons yet — use everyday B1 grammar)"
    parts = []
    for h in hws:
        words = ", ".join(w.word for w in h.words[:12])
        parts.append(f"{h.topic_name} (grammar: {h.grammar_points or h.topic_name}; words: {words or '-'})")
    return "; ".join(parts)


def _system_for(db: Session, user: User, topic: str) -> str:
    lessons = _lessons_context(db, user)
    context = prompts.SPEAKING_TOPICS.get(topic, prompts.SPEAKING_TOPICS["free"]).replace("{lessons}", lessons)
    if topic != "lessons":
        context += f" When natural, also recycle the student's recent lesson grammar/words: {lessons}"
    return prompts.SPEAKING_SYSTEM.format(level=user.level, context=context)


@router.get("/topics")
def topics():
    return [{"id": k, "greeting": v} for k, v in GREETINGS.items()]


@router.post("/sessions")
def start_session(body: SpeakingStart, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topic = body.topic if body.topic in GREETINGS else "free"
    session_id = f"sp-{topic}-{uuid.uuid4().hex[:12]}"
    greeting = GREETINGS[topic]
    if topic == "free" and user.name and user.name != "Student":
        greeting = greeting.replace("Hi there!", f"Hi {user.name}!")
    db.add(ChatMessage(user_id=user.id, session_id=session_id, mode="speaking", message_role="assistant", message_content=greeting))
    db.commit()
    return {"session_id": session_id, "topic": topic, "reply": greeting}


@router.post("/sessions/{session_id}/message")
async def send_message(session_id: str, body: SpeakingMessage, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    history = (
        db.query(ChatMessage).filter_by(user_id=user.id, session_id=session_id)
        .order_by(ChatMessage.id.desc()).limit(16).all()
    )
    if not history:
        raise HTTPException(404, "Suhbat topilmadi — yangi suhbat boshlang")
    history.reverse()
    topic = session_id.split("-")[1] if session_id.count("-") >= 2 else "free"

    messages = []
    for m in history:
        content = m.message_content
        if m.message_role == "assistant" and m.correction:
            content += f"\n[You corrected the student: '{m.correction.get('corrected')}' and asked them to repeat it.]"
        messages.append({"role": m.message_role, "content": content})
    messages.append({"role": "user", "content": body.text})

    data = await ai.chat_json(_system_for(db, user, topic), messages)

    reply = (data.get("reply") or "").strip() or "Sorry, could you say that again?"
    correction = data.get("correction") or None
    if correction and not correction.get("corrected"):
        correction = None
    praise = data.get("praise_uz") or ""

    # Avvalgi xabarda tuzatish so'ralgan bo'lsa va hozir xato yo'q bo'lsa — qo'shimcha XP
    prev_correction = next((m.correction for m in reversed(history) if m.message_role == "assistant"), None)
    xp = award_xp(db, user, "speaking_turn", speaking_turns=1)
    if prev_correction and not correction:
        xp += award_xp(db, user, "speaking_fixed")

    db.add(ChatMessage(user_id=user.id, session_id=session_id, mode="speaking", message_role="user", message_content=body.text))
    db.add(ChatMessage(user_id=user.id, session_id=session_id, mode="speaking", message_role="assistant",
                       message_content=reply, correction=correction))
    if correction:
        add_weak_spot(
            db, user, source="speaking", topic=correction.get("type", "speaking").replace("_", " ").title(),
            section="speaking", question=f"Speaking: \"{correction.get('original') or body.text}\"",
            user_answer=body.text, correct_answer=correction["corrected"],
            explanation=correction.get("explanation_uz", ""),
        )
    db.commit()
    return {"reply": reply, "correction": correction, "praise_uz": praise, "xp_earned": xp}


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(ChatMessage.session_id).filter_by(user_id=user.id, mode="speaking")
        .distinct().all()
    )
    out = []
    for (sid,) in rows:
        msgs = db.query(ChatMessage).filter_by(session_id=sid).order_by(ChatMessage.id).all()
        user_turns = [m for m in msgs if m.message_role == "user"]
        if not user_turns:
            continue
        out.append({
            "session_id": sid,
            "topic": sid.split("-")[1] if sid.count("-") >= 2 else "free",
            "turns": len(user_turns),
            "corrections": sum(1 for m in msgs if m.correction),
            "started_at": msgs[0].timestamp.isoformat(),
            "preview": user_turns[0].message_content[:80],
        })
    return sorted(out, key=lambda s: s["started_at"], reverse=True)[:20]


@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    msgs = db.query(ChatMessage).filter_by(user_id=user.id, session_id=session_id).order_by(ChatMessage.id).all()
    return [{"role": m.message_role, "content": m.message_content, "correction": m.correction} for m in msgs]
