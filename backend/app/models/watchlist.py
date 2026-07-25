from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Uuid, ForeignKey, String, Integer, DateTime, UniqueConstraint

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Watchlist(Base):
    __tablename__ = "watchlists"

    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    symbol: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default="NOW()"
    )

    # Relationships
    user = relationship("User", back_populates="watchlists")

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_watchlists_user_symbol"),
    )
