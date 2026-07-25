from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Numeric, DateTime, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class MarketTickerCache(Base):
    __tablename__ = "market_tickers_cache"

    symbol: Mapped[str] = mapped_column(
        String(20),
        primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    change_val: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0.0,
        server_default="0.0"
    )
    change_pct: Mapped[Decimal] = mapped_column(
        Numeric(8, 4),
        nullable=False,
        default=0.0,
        server_default="0.0"
    )
    prev_close: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )
    volume: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default="NOW()"
    )


class MarketSectorCache(Base):
    __tablename__ = "market_sectors_cache"

    sector: Mapped[str] = mapped_column(
        String(50),
        primary_key=True
    )
    change_pct: Mapped[Decimal] = mapped_column(
        Numeric(8, 4),
        nullable=False,
        default=0.0,
        server_default="0.0"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default="NOW()"
    )
