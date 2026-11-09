"""Pydantic so'rov (request) sxemalari."""
from pydantic import BaseModel, Field


class HomeworkCreate(BaseModel):
    topic_name: str = Field(..., min_length=2, max_length=200, examples=["Past Perfect vs Past Simple"])
    grammar_points: str = ""
    vocabulary_raw: str = Field("", description="Har qatorda bitta so'z: 'word - tarjima' (tarjima ixtiyoriy)")
    questions: str = Field("", description="Tushunmagan savollar")
    homework_number: int | None = None


class DrillSubmit(BaseModel):
    answers: dict[str, str]  # {"1": "had started", ...}


class FollowUpQuestion(BaseModel):
    question: str = Field(..., min_length=2)


class MockSubmit(BaseModel):
    answers: dict[str, int]  # {"1": 2, ...}  question_id -> tanlangan variant indeksi
    time_spent_sec: int = 0


class VocabCreate(BaseModel):
    words: str = Field(..., min_length=1, description="Har qatorda bitta so'z")


class VocabReview(BaseModel):
    quality: int = Field(..., ge=0, le=5)


class VocabUpdate(BaseModel):
    translation_uz: str | None = None
    definition_en: str | None = None
    example_sentence: str | None = None
    mnemonic: str | None = None


class SpeakingStart(BaseModel):
    topic: str = "free"  # free | lessons | cafe | interview | travel | exam


class SpeakingMessage(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class PlanTaskToggle(BaseModel):
    day: str
    task_index: int


class SettingsUpdate(BaseModel):
    name: str | None = None
    level: str | None = None
    target_score: int | None = Field(None, ge=0, le=100)
    study_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    telegram_chat_id: str | None = None
    notifications_enabled: bool | None = None


class PracticeResult(BaseModel):
    kind: str  # typing | reading
    correct: int = 0
    total: int = 0
    minutes: int = 0
