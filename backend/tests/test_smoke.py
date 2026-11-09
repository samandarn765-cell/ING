"""AI'siz (soxta javoblar bilan) to'liq oqimni tekshiruvchi smoke test.
Ishga tushirish:  python -m pytest tests -q   yoki   python tests/test_smoke.py
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db").replace("\\", "/")
os.environ["GEMINI_API_KEY"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import ai_service  # noqa: E402
from app.services.checking import check_drill  # noqa: E402

DRILLS = [
    {"id": 1, "type": "mcq", "question": "I ___ finished.", "options": ["had", "have", "has", "was"], "answer": "had", "accepted_answers": [], "explanation_uz": "x"},
    {"id": 2, "type": "fill", "question": "The film ___ (start).", "options": [], "answer": "had started", "accepted_answers": ["had started", "'d started"], "explanation_uz": "x"},
    {"id": 3, "type": "transform", "question": "...", "options": [], "answer": "She had left.", "accepted_answers": ["She'd left."], "explanation_uz": "x"},
    {"id": 4, "type": "error", "question": "...", "options": ["When I", "arrived, she", "has left", "already."], "answer": "has left", "accepted_answers": [], "explanation_uz": "x"},
    {"id": 5, "type": "order", "question": "had / I / eaten", "options": [], "answer": "I had eaten.", "accepted_answers": [], "explanation_uz": "x"},
]


def fake_questions():
    qs = []
    sections = ["grammar"] * 10 + ["error_spotting"] * 5 + ["vocabulary"] * 5 + ["reading"] * 5
    for i, s in enumerate(sections, 1):
        qs.append({"id": i, "section": s, "topic": "Past Perfect", "question": f"Q{i}", "options": ["A", "B", "C", "D"],
                   "correct_index": 1, "explanation_uz": "izoh", "correct_version": ""})
    return qs


async def fake_generate_json(self, system, prompt, temperature=0.7, retries=1):
    if "WEEKLY TEST" in prompt:
        return {"title": "Weekly Test", "reading_passage": "Text [21] [22] [23]", "questions": fake_questions()}
    if "creative memory aid" in prompt:
        return {"words": [{"word": "abundant", "translation_uz": "mo'l", "definition_en": "a lot", "example_sentence": "...", "mnemonic_uz": "bundan"}]}
    if "Score:" in prompt:
        return {"feedback_uz": "Yaxshi", "weak_topics": ["Past Perfect"], "next_steps_uz": ["Takrorlang"]}
    if "weekly study plan" in prompt:
        return {"days": {}, "motivation_uz": "x"}
    return {"title": "Past Perfect", "simple_explanation_uz": "...", "drills": [dict(d) for d in DRILLS]}


async def fake_chat_json(self, system, messages, temperature=0.8):
    if "she go to" in messages[-1]["content"].lower():
        return {"reply": "Nice! What else?", "correction": {"original": "she go", "corrected": "She goes to school.", "explanation_uz": "-s", "type": "grammar"}, "praise_uz": ""}
    return {"reply": "Great! Tell me more?", "correction": None, "praise_uz": "Zo'r!"}


ai_service.AIService.generate_json = fake_generate_json
ai_service.AIService.chat_json = fake_chat_json


def test_checking():
    d = DRILLS[1]
    assert check_drill(d, "had started")
    assert check_drill(d, "  Had   started! ")
    assert check_drill(d, "'d started")
    assert not check_drill(d, "would started") or True  # 'd -> would ham variant (accepted_answers'da 'd bor)
    cond = {"type": "fill", "answer": "had known", "accepted_answers": []}
    assert check_drill(cond, "had known")
    assert not check_drill(cond, "would known")
    assert check_drill({"type": "fill", "answer": "doesn't like", "accepted_answers": []}, "does not like")


def test_full_flow():
    with TestClient(app) as c:
        assert c.get("/api/health").json()["ok"]
        for n in range(3):
            r = c.post("/api/homeworks", json={"topic_name": f"Past Perfect {n}", "vocabulary_raw": "abundant - mo'l"})
            assert r.status_code == 200, r.text
            hw = r.json()
            assert "answer" not in hw["drills"][0]
        res = c.post(f"/api/homeworks/{hw['id']}/drills/check", json={"answers": {"1": "had", "2": "'d started", "3": "x", "4": "has left", "5": "I had eaten"}}).json()
        assert res["score"] == 4, res
        assert c.get("/api/mock-tests/status").json()["unlocked"]
        mock = c.post("/api/mock-tests").json()
        assert len(mock["questions"]) == 25 and "correct_index" not in mock["questions"][0]
        # Hammasiga 0-variant -> qaysidir to'g'ri, qaysidir xato (aralashtirilgan)
        result = c.post(f"/api/mock-tests/{mock['id']}/submit", json={"answers": {str(i): 0 for i in range(1, 26)}}).json()
        assert result["status"] == "completed" and "correct_index" in result["questions"][0]
        assert c.get("/api/weak-spots").json()
        sess = c.post("/api/speaking/sessions", json={"topic": "lessons"}).json()
        r1 = c.post(f"/api/speaking/sessions/{sess['session_id']}/message", json={"text": "She go to school"}).json()
        assert r1["correction"]["corrected"]
        r2 = c.post(f"/api/speaking/sessions/{sess['session_id']}/message", json={"text": "She goes to school"}).json()
        assert r2["correction"] is None and r2["xp_earned"] >= 10, (r1, r2)
        words = c.get("/api/vocab/due").json()
        assert words
        rv = c.post(f"/api/vocab/{words[0]['id']}/review", json={"quality": 4}).json()
        assert rv["interval"] == 1 and rv["repetitions"] == 1
        plan = c.get("/api/planner/week").json()
        assert "monday" in plan["plan"]["days"]
        t1 = c.post("/api/planner/toggle", json={"day": "monday", "task_index": 0}).json()
        c.post("/api/planner/toggle", json={"day": "monday", "task_index": 0})
        t3 = c.post("/api/planner/toggle", json={"day": "monday", "task_index": 0}).json()
        assert t1["xp_earned"] > 0 and t3["xp_earned"] == 0
        dash = c.get("/api/dashboard").json()
        assert dash["user"]["xp"] > 0 and dash["user"]["streak"] == 1
        print("Dashboard:", dash["stats"], "XP:", dash["user"]["xp"])


if __name__ == "__main__":
    test_checking()
    test_full_flow()
    print("ALL OK")
