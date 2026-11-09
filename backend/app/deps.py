from fastapi import Depends
from sqlalchemy.orm import Session

from .database import get_db
from .models import User


def get_current_user(db: Session = Depends(get_db)) -> User:
    """Shaxsiy ilova: bitta foydalanuvchi. Kelajakda JWT auth bilan almashtirish oson."""
    user = db.query(User).order_by(User.id).first()
    if not user:
        user = User(name="Student")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
