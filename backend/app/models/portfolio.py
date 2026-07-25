from datetime import datetime, date
from uuid import UUID, uuid4
from decimal import Decimal
from sqlalchemy import Uuid, ForeignKey, String, Integer, Numeric, DateTime, Date, UniqueConstraint

from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class PortfolioHolding(Base, TimestampMixin):
    __tablename__ = "portfolio_holdings"

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
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    qty: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    avg_buy: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    sector: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Other",
        server_default="Other"
    )

    # Relationships
    user = relationship("User", back_populates="portfolio_holdings")

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_holdings_user_symbol"),
    )


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

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
    snapshot_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )
    total_value: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default="NOW()"
    )

    # Relationships
    user = relationship("User", back_populates="portfolio_snapshots")

    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_date", name="uq_snapshots_user_date"),
    )
