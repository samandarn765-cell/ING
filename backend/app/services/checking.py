"""Mashq (drill) javoblarini lokal tekshirish va variantlarni aralashtirish."""
import itertools
import random
import re
import unicodedata

CONTRACTIONS = {
    "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is", "it's": "it is",
    "we're": "we are", "they're": "they are", "isn't": "is not", "aren't": "are not",
    "wasn't": "was not", "weren't": "were not", "don't": "do not", "doesn't": "does not",
    "didn't": "did not", "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
    "won't": "will not", "wouldn't": "would not", "can't": "can not", "cannot": "can not",
    "couldn't": "could not", "shouldn't": "should not", "mustn't": "must not",
    "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
    "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
    "we'll": "we will", "they'll": "they will", "let's": "let us", "that's": "that is",
    "there's": "there is", "what's": "what is",
}


def _tokens(text: str) -> list[str]:
    text = unicodedata.normalize("NFKC", text or "").lower().strip()
    text = text.replace("’", "'").replace("‘", "'").replace("`", "'")
    out = []
    for w in re.split(r"\s+", text):
        w = re.sub(r"[^\w']", "", w).strip("'")
        if w:
            out.append(w)
    return out


def variants(text: str) -> set[str]:
    """Javobning barcha teng kuchli shakllari. "'d" ham "had", ham "would" bo'lishi mumkin,
    shuning uchun ikkala variant yaratiladi (lekin "had" va "would" o'zaro almashtirilmaydi)."""
    options: list[list[str]] = []
    for w in _tokens(text):
        if w in CONTRACTIONS:
            options.append([CONTRACTIONS[w]])
        elif w.endswith("'d") and len(w) > 2:
            base = w[:-2]
            options.append([f"{base} had", f"{base} would"])
        else:
            options.append([w])
    if sum(len(o) > 1 for o in options) > 4:  # kombinatsiya portlashining oldini olish
        options = [o[:1] for o in options]
    return {" ".join(combo) for combo in itertools.product(*options)} if options else set()


def normalize(text: str) -> str:
    v = sorted(variants(text))
    return v[0] if v else ""


def check_drill(drill: dict, user_answer: str | None) -> bool:
    if not user_answer or not user_answer.strip():
        return False
    user_forms = variants(user_answer)
    if drill.get("type") == "error":
        # error drillda javob — xato segmentning o'zi (tanlov)
        return bool(user_forms & variants(drill.get("answer", "")))
    correct_forms: set[str] = set()
    for c in [drill.get("answer", "")] + list(drill.get("accepted_answers") or []):
        if c:
            correct_forms |= variants(c)
    return bool(user_forms & correct_forms)


def shuffle_drill_options(drills: list[dict]) -> list[dict]:
    for d in drills:
        if d.get("type") == "mcq" and d.get("options"):
            random.shuffle(d["options"])
    return drills


def shuffle_mcq(question: dict) -> dict:
    """Modellar to'g'ri javobni ko'pincha A/B ga qo'yadi — variantlarni aralashtiramiz.
    Error spotting'da segmentlar gap tartibida bo'lgani uchun aralashtirilmaydi."""
    opts = question.get("options") or []
    idx = question.get("correct_index", 0)
    if question.get("section") == "error_spotting" or len(opts) < 2 or not isinstance(idx, int) or not (0 <= idx < len(opts)):
        return question
    correct = opts[idx]
    order = list(range(len(opts)))
    random.shuffle(order)
    question["options"] = [opts[i] for i in order]
    question["correct_index"] = order.index(idx)
    assert question["options"][question["correct_index"]] == correct
    return question
