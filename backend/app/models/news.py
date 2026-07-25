from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Uuid, String, Boolean, DateTime, Text

from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid4
    )
    headline: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    source: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    excerpt: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    category: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    sentiment: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="Neutral",
        server_default="Neutral"
    )
    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )
    featured: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )
    source_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default="NOW()"
    )
