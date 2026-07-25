"""seed_sectors

Revision ID: 53c28849b364
Revises: 3e2bed755d30
Create Date: 2026-07-16 22:13:00.455903

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '53c28849b364'
down_revision: Union[str, Sequence[str], None] = '3e2bed755d30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    market_sectors_table = sa.table(
        'market_sectors_cache',
        sa.column('sector', sa.String),
        sa.column('change_pct', sa.Numeric),
    )

    op.bulk_insert(
        market_sectors_table,
        [
            {"sector": "IT", "change_pct": 0.0},
            {"sector": "Banking", "change_pct": 0.0},
            {"sector": "Pharma", "change_pct": 0.0},
            {"sector": "FMCG", "change_pct": 0.0},
            {"sector": "Auto", "change_pct": 0.0},
            {"sector": "Metal", "change_pct": 0.0},
            {"sector": "Realty", "change_pct": 0.0},
            {"sector": "Energy", "change_pct": 0.0},
            {"sector": "Media", "change_pct": 0.0},
            {"sector": "Infra", "change_pct": 0.0},
            {"sector": "PSU Bank", "change_pct": 0.0},
            {"sector": "Pvt Bank", "change_pct": 0.0},
        ]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM market_sectors_cache")
