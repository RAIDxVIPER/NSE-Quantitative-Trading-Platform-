"""seed_search_index

Revision ID: 3e2bed755d30
Revises: 2668ab8780f9
Create Date: 2026-07-16 21:57:16.120225

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e2bed755d30'
down_revision: Union[str, Sequence[str], None] = '2668ab8780f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    search_index_table = sa.table(
        'search_index',
        sa.column('symbol', sa.String),
        sa.column('name', sa.String),
        sa.column('sector', sa.String),
        sa.column('type', sa.String),
        sa.column('market_cap', sa.Numeric),
    )

    op.bulk_insert(
        search_index_table,
        [
            {"symbol": "NIFTY 50", "name": "NIFTY 50 Index", "sector": "Indices", "type": "Index", "market_cap": None},
            {"symbol": "SENSEX", "name": "BSE SENSEX Index", "sector": "Indices", "type": "Index", "market_cap": None},
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy", "type": "Stock", "market_cap": 20000000.00},
            {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "sector": "IT", "type": "Stock", "market_cap": 14000000.00},
            {"symbol": "INFY", "name": "Infosys Ltd", "sector": "IT", "type": "Stock", "market_cap": 6000000.00},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Banking", "type": "Stock", "market_cap": 12000000.00},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Banking", "type": "Stock", "market_cap": 8000000.00},
            {"symbol": "WIPRO", "name": "Wipro Ltd", "sector": "IT", "type": "Stock", "market_cap": 2500000.00},
            {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "sector": "Banking", "type": "Stock", "market_cap": 4500000.00},
            {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "sector": "Telecom", "type": "Stock", "market_cap": 8500000.00},
            {"symbol": "ITC", "name": "ITC Ltd", "sector": "FMCG", "type": "Stock", "market_cap": 5500000.00},
            {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "sector": "FMCG", "type": "Stock", "market_cap": 6000000.00},
            {"symbol": "SBIN", "name": "State Bank of India", "sector": "Banking", "type": "Stock", "market_cap": 5500000.00},
            {"symbol": "LT", "name": "Larsen & Toubro Ltd", "sector": "Infra", "type": "Stock", "market_cap": 5000000.00},
            {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd", "sector": "Banking", "type": "Stock", "market_cap": 3500000.00},
        ]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM search_index")
