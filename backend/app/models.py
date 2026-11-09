"""SQLAlchemy ma'lumotlar bazasi modellari."""
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), default="Student")
    level: Mapped[str] = mapped_column(String(30), default="Intermediate")
    target_score: Mapped[int] = mapped_column(Integer, default=85)  # foiz
    xp: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    study_time: Mapped[str] = mapped_column(String(5), default="19:00")  # HH:MM
    telegram_chat_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    homeworks: Mapped[list["Homework"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Homework(Base):
    __tablename__ = "homeworks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    homework_number: Mapped[int] = mapped_column(Integer)
    topic_name: Mapped[str] = mapped_column(String(200))
    grammar_points: Mapped[str] = mapped_column(Text, default="")
    vocabulary_raw: Mapped[str] = mapped_column(Text, default="")
    questions: Mapped[str] = mapped_column(Text, default="")  # tushunmagan savollar
    explanation: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    drills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    drill_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    mock_test_id: Mapped[int | None] = mapped_column(ForeignKey("mock_tests.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="homeworks")
    words: Mapped[list["Vocabulary"]] = relationship(back_populates="homework")


class Vocabulary(Base):
    __tablename__ = "vocabulary"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    homework_id: Mapped[int | None] = mapped_column(ForeignKey("homeworks.id", ondelete="SET NULL"), nullable=True)
    word: Mapped[str] = mapped_column(String(120))
    translation_uz: Mapped[str] = mapped_column(String(255), default="")
    definition_en: Mapped[str] = mapped_column(Text, default="")
    example_sentence: Mapped[str] = mapped_column(Text, default="")
    mnemonic: Mapped[str] = mapped_column(Text, default="")
    part_of_speech: Mapped[str] = mapped_column(String(30), default="")
    # SM-2 maydonlari
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review_date: Mapped[date] = mapped_column(Date, default=date.today)
    last_reviewed: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    homework: Mapped[Homework | None] = relationship(back_populates="words")


class MockTest(Base):
    __tablename__ = "mock_tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200), default="Weekly Mock Test")
    based_on_homework_ids: Mapped[list] = mapped_column(JSON, default=list)
    reading_passage: Mapped[str] = mapped_column(Text, default="")
    questions: Mapped[list] = mapped_column(JSON, default=list)  # javob kalitlari bilan
    answers: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {question_id: chosen_index}
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | completed
    score: Mapped[int] = mapped_column(Integer, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, default=25)
    section_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    weak_topics: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_feedback: Mapped[str] = mapped_column(Text, default="")
    time_spent_sec: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class WeakSpot(Base):
    """Xatolar daftarchasi."""
    __tablename__ = "weak_spots"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    source: Mapped[str] = mapped_column(String(30))  # mock_test | drill | speaking
    source_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    topic: Mapped[str] = mapped_column(String(200), default="General")
    section: Mapped[str] = mapped_column(String(40), default="grammar")
    question: Mapped[str] = mapped_column(Text)
    user_answer: Mapped[str] = mapped_column(Text, default="")
    correct_answer: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    times_wrong: Mapped[int] = mapped_column(Integer, default=1)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    session_id: Mapped[str] = mapped_column(String(40), index=True)
    mode: Mapped[str] = mapped_column(String(30))  # speaking | homework_explainer | general_qa
    message_role: Mapped[str] = mapped_column(String(20))  # user | assistant
    message_content: Mapped[str] = mapped_column(Text)
    correction: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    week_start: Mapped[date] = mapped_column(Date, index=True)
    plan: Mapped[dict] = mapped_column(JSON)  # {"monday": {...tasks}, ...}
    completed: Mapped[dict] = mapped_column(JSON, default=dict)  # {"monday": [0, 2]}
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PracticeSet(Base):
    """AI generatsiya qilgan mashq to'plamlari: weak-spot review, typing, reading."""
    __tablename__ = "practice_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(30))  # weakspot_review | typing | reading
    payload: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyActivity(Base):
    __tablename__ = "daily_activity"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    day: Mapped[date] = mapped_column(Date, index=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    words_reviewed: Mapped[int] = mapped_column(Integer, default=0)
    speaking_turns: Mapped[int] = mapped_column(Integer, default=0)
    minutes: Mapped[int] = mapped_column(Integer, default=0)
