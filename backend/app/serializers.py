"""Model -> JSON (dict) o'giruvchilar."""
from .models import Homework, MockTest, Vocabulary, WeakSpot
from .services.srs_service import mastery_label


def public_drills(drills: list | None) -> list:
    """Frontendga javob kalitlarisiz yuboriladi."""
    hidden = {"answer", "accepted_answers", "explanation_uz"}
    return [{k: v for k, v in d.items() if k not in hidden} for d in (drills or [])]


def vocab_out(v: Vocabulary) -> dict:
    return {
        "id": v.id,
        "homework_id": v.homework_id,
        "word": v.word,
        "part_of_speech": v.part_of_speech,
        "translation_uz": v.translation_uz,
        "definition_en": v.definition_en,
        "example_sentence": v.example_sentence,
        "mnemonic": v.mnemonic,
        "repetitions": v.repetitions,
        "interval": v.interval,
        "ease_factor": round(v.ease_factor, 2),
        "next_review_date": v.next_review_date.isoformat() if v.next_review_date else None,
        "mastery": mastery_label(v),
    }


def homework_out(h: Homework, full: bool = True) -> dict:
    data = {
        "id": h.id,
        "homework_number": h.homework_number,
        "topic_name": h.topic_name,
        "grammar_points": h.grammar_points,
        "vocabulary_raw": h.vocabulary_raw,
        "questions": h.questions,
        "has_explanation": bool(h.explanation),
        "drill_score": (h.drill_results or {}).get("score"),
        "mock_test_id": h.mock_test_id,
        "word_count": len(h.words),
        "created_at": h.created_at.isoformat(),
    }
    if full:
        data["explanation"] = h.explanation
        data["drills"] = public_drills(h.drills)
        data["drill_results"] = h.drill_results
        data["words"] = [vocab_out(w) for w in h.words]
    return data


def mock_out(m: MockTest) -> dict:
    data = {
        "id": m.id,
        "title": m.title,
        "status": m.status,
        "based_on_homework_ids": m.based_on_homework_ids,
        "score": m.score,
        "total_questions": m.total_questions,
        "percent": round(m.score * 100 / m.total_questions) if m.total_questions else 0,
        "section_scores": m.section_scores,
        "created_at": m.created_at.isoformat(),
        "completed_at": m.completed_at.isoformat() if m.completed_at else None,
        "time_spent_sec": m.time_spent_sec,
    }
    return data


def mock_detail(m: MockTest) -> dict:
    data = mock_out(m)
    data["reading_passage"] = m.reading_passage
    if m.status == "completed":
        data["questions"] = m.questions
        data["answers"] = m.answers
        data["weak_topics"] = m.weak_topics
        data["ai_feedback"] = m.ai_feedback
    else:
        hidden = {"correct_index", "explanation_uz", "correct_version"}
        data["questions"] = [{k: v for k, v in q.items() if k not in hidden} for q in m.questions]
    return data


def weakspot_out(w: WeakSpot) -> dict:
    return {
        "id": w.id,
        "source": w.source,
        "source_id": w.source_id,
        "topic": w.topic,
        "section": w.section,
        "question": w.question,
        "user_answer": w.user_answer,
        "correct_answer": w.correct_answer,
        "explanation": w.explanation,
        "times_wrong": w.times_wrong,
        "resolved": w.resolved,
        "created_at": w.created_at.isoformat(),
    }
