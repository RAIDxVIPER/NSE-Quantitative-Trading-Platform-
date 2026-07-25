from datetime import datetime
from uuid import UUID
from sqlalchemy import Uuid, String, ForeignKey, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )
    metadata_: Mapped[dict] = mapped_column(
        "metadata",  # Maps to 'metadata' column in Postgres to avoid clash with sqlalchemy Base metadata
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default="NOW()"
    )

    # Relationships
    user = relationship("User", back_populates="audit_logs")
