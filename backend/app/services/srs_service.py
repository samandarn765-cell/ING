"""SM-2 (SuperMemo-2) Spaced Repetition algoritmi.

quality: 0-5
  0-2 -> "Again" (unutdim): kartochka qaytadan boshlanadi, ertaga yana chiqadi
  3   -> "Hard"
  4   -> "Good"
  5   -> "Easy"
Birinchi intervallar: 1 kun -> 3 kun -> 7 kun -> keyin interval * EF (14, 30, ...).
"""
from datetime import date, datetime, timedelta

from ..models import Vocabulary


def apply_sm2(card: Vocabulary, quality: int, today: date | None = None) -> Vocabulary:
    today = today or date.today()
    quality = max(0, min(5, quality))

    if quality < 3:
        card.repetitions = 0
        card.interval = 1
    else:
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 3
        elif card.repetitions == 2:
            card.interval = 7
        else:
            card.interval = max(card.interval + 1, round(card.interval * card.ease_factor))
        if quality == 5 and card.repetitions >= 1:
            card.interval = round(card.interval * 1.3)
        card.repetitions += 1

    card.ease_factor = max(1.3, card.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    card.next_review_date = today + timedelta(days=card.interval)
    card.last_reviewed = datetime.utcnow()
    return card


def mastery_label(card: Vocabulary) -> str:
    if card.repetitions == 0:
        return "new"
    if card.interval < 7:
        return "learning"
    if card.interval < 21:
        return "reviewing"
    return "mastered"
