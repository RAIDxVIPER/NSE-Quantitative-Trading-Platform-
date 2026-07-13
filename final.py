"""
NSE Quantitative Finance Dashboard
===================================
Integrated platform combining:
  1. Real-time NSE Order Book simulation (live-refreshing)
  2. Market Regime Detection (GMM on real NIFTY data)
  3. Options Pricing with live implied volatility
  4. Liquidity Shock Detection with ML stress testing

Run with:
    streamlit run dashboard.py
"""

import time
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy.stats import norm
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge, Lasso
from sklearn.model_selection import train_test_split

# ─────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="NSE Quant Dashboard",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─────────────────────────────────────────────
# DARK THEME CSS
# ─────────────────────────────────────────────
st.markdown("""
<style>
    /* Main background */
    .stApp { background-color: #0d1117; color: #e6edf3; }
    section[data-testid="stSidebar"] { background-color: #161b22; }
    section[data-testid="stSidebar"] * { color: #e6edf3 !important; }

    /* Metric cards */
    div[data-testid="metric-container"] {
        background-color: #161b22;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 12px 16px;
    }
    div[data-testid="metric-container"] label { color: #8b949e !important; font-size: 12px; }
    div[data-testid="metric-container"] div[data-testid="stMetricValue"] {
        color: #58a6ff !important; font-size: 22px; font-weight: 700;
    }
    div[data-testid="metric-container"] div[data-testid="stMetricDelta"] { font-size: 13px; }

    /* Headers */
    h1 { color: #58a6ff !important; font-size: 28px !important; }
    h2 { color: #79c0ff !important; font-size: 20px !important; border-bottom: 1px solid #30363d; padding-bottom: 6px; }
    h3 { color: #d2a8ff !important; font-size: 15px !important; }

    /* Tabs */
    .stTabs [data-baseweb="tab-list"] { background-color: #161b22; border-radius: 8px; }
    .stTabs [data-baseweb="tab"] { color: #8b949e; }
    .stTabs [aria-selected="true"] { color: #58a6ff !important; border-bottom: 2px solid #58a6ff; }

    /* Sidebar sliders/selects */
    .stSlider > div > div { background-color: #21262d; }
    div[data-baseweb="select"] > div { background-color: #21262d !important; border-color: #30363d !important; }

    /* Status badge */
    .live-badge {
        display: inline-block; background-color: #238636;
        color: white; border-radius: 12px; padding: 2px 10px;
        font-size: 11px; font-weight: 600; margin-left: 8px;
        animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

    /* Section card */
    .section-card {
        background-color: #161b22; border: 1px solid #30363d;
        border-radius: 10px; padding: 16px; margin-bottom: 12px;
    }

    /* Info box */
    .info-box {
        background-color: #1f2937; border-left: 3px solid #58a6ff;
        padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #c9d1d9;
    }

    /* Warning box */
    .warn-box {
        background-color: #1f1a0e; border-left: 3px solid #d29922;
        padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #e3b341;
    }
</style>
""", unsafe_allow_html=True)

PLOTLY_TEMPLATE = dict(
    layout=dict(
        paper_bgcolor="#0d1117", plot_bgcolor="#161b22",
        font=dict(color="#e6edf3", family="monospace", size=11),
        xaxis=dict(gridcolor="#21262d", linecolor="#30363d", zerolinecolor="#30363d"),
        yaxis=dict(gridcolor="#21262d", linecolor="#30363d", zerolinecolor="#30363d"),
        legend=dict(bgcolor="#161b22", bordercolor="#30363d", borderwidth=1),
        margin=dict(l=40, r=20, t=40, b=40),
        colorway=["#58a6ff","#3fb950","#d29922","#f78166","#d2a8ff","#79c0ff"],
    )
)

# ─────────────────────────────────────────────
# DATA LAYER  — yfinance with graceful fallback
# ─────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def fetch_nse_data(symbol: str, period: str = "1y") -> pd.DataFrame:
    """
    Fetch OHLCV from Yahoo Finance (NSE). Falls back to realistic
    synthetic data if the network is unavailable (e.g. CI/sandbox).
    """
    try:
        import yfinance as yf
        df = yf.download(symbol, period=period, auto_adjust=True, progress=False)
        if df.empty:
            raise ValueError("Empty response from yfinance")
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df = df[["Open", "High", "Low", "Close", "Volume"]].dropna()
        df.index = pd.to_datetime(df.index)
        df.attrs["source"] = "live"
        return df
    except Exception:
        return _synthetic_ohlcv(symbol)


def _synthetic_ohlcv(symbol: str) -> pd.DataFrame:
    """Realistic GBM-based fallback so the dashboard is always demo-able."""
    np.random.seed(abs(hash(symbol)) % 2**31)
    n = 252
    dates = pd.bdate_range(end=pd.Timestamp.today(), periods=n)

    base = {"^NSEI": 22000, "RELIANCE.NS": 2900, "TCS.NS": 3800,
            "INFY.NS": 1500, "HDFCBANK.NS": 1650}.get(symbol, 1000)

    sigma, mu = 0.015, 0.0004
    log_returns = np.random.normal(mu - 0.5 * sigma**2, sigma, n)
    close = base * np.exp(np.cumsum(log_returns))
    high  = close * (1 + np.abs(np.random.normal(0, 0.005, n)))
    low   = close * (1 - np.abs(np.random.normal(0, 0.005, n)))
    open_ = np.roll(close, 1); open_[0] = base
    vol   = np.random.randint(5_000_000, 50_000_000, n).astype(float)

    df = pd.DataFrame({"Open": open_, "High": high, "Low": low,
                       "Close": close, "Volume": vol}, index=dates)
    df.attrs["source"] = "synthetic"
    return df


@st.cache_data(ttl=60, show_spinner=False)
def fetch_live_quote(symbol: str) -> dict:
    """Return latest price, change, and % change."""
    try:
        import yfinance as yf
        tk = yf.Ticker(symbol)
        info = tk.fast_info
        price  = float(info.last_price)
        prev   = float(info.previous_close) if hasattr(info, "previous_close") else price
        change = price - prev
        pct    = (change / prev * 100) if prev else 0
        return {"price": price, "change": change, "pct": pct, "source": "live"}
    except Exception:
        # fallback: use last row of cached OHLCV
        df = fetch_nse_data(symbol)
        price = float(df["Close"].iloc[-1])
        prev  = float(df["Close"].iloc[-2]) if len(df) > 1 else price
        change = price - prev
        pct    = (change / prev * 100) if prev else 0
        return {"price": price, "change": change, "pct": pct, "source": "synthetic"}


# ─────────────────────────────────────────────
# FEATURE ENGINEERING (shared across modules)
# ─────────────────────────────────────────────

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute returns, volatility, momentum, and microstructure proxies."""
    f = df.copy()
    f["returns"]     = f["Close"].pct_change()
    f["log_ret"]     = np.log(f["Close"] / f["Close"].shift(1))
    f["vol_20"]      = f["log_ret"].rolling(20).std() * np.sqrt(252)
    f["vol_5"]       = f["log_ret"].rolling(5).std()  * np.sqrt(252)
    f["ma_10"]       = f["Close"].rolling(10).mean()
    f["ma_50"]       = f["Close"].rolling(50).mean()
    f["momentum"]    = f["Close"] - f["Close"].shift(10)
    f["spread_proxy"]= (f["High"] - f["Low"]) / f["Close"]   # Corwin-Schultz proxy
    f["buy_pressure"]= (f["Close"] - f["Low"]) / (f["High"] - f["Low"] + 1e-9)
    f["sell_pressure"]= 1 - f["buy_pressure"]
    f["imbalance"]   = f["buy_pressure"] - f["sell_pressure"]
    # BUG FIX: clip depth_proxy to avoid explosive outliers when spread_proxy ≈ 0
    raw_depth        = f["Volume"] / (f["spread_proxy"] + 1e-6)
    f["depth_proxy"] = raw_depth.clip(upper=raw_depth.quantile(0.99))
    f["future_ret"]  = f["log_ret"].shift(-5)
    
    # Drop rows where features are NaN, but keep rows where only future_ret is NaN
    # so we can predict future returns for the most recent days!
    feature_cols = ["vol_20", "vol_5", "imbalance", "spread_proxy",
                    "buy_pressure", "sell_pressure", "depth_proxy", "momentum"]
    return f.dropna(subset=feature_cols)


# ─────────────────────────────────────────────
# MODULE 1 — REAL-TIME ORDER BOOK
# ─────────────────────────────────────────────

def simulate_order_book(mid_price: float, spread_pct: float = 0.002,
                        depth: int = 10, seed: int = None) -> dict:
    """
    Generate a realistic limit order book around a live mid price.
    Uses a power-law depth decay (standard microstructure model).
    """
    rng = np.random.default_rng(seed if seed else int(time.time() * 1000) % 2**32)
    tick = mid_price * 0.0001

    bid_prices = [round(mid_price - (i + 1) * tick * spread_pct * 500, 2) for i in range(depth)]
    ask_prices = [round(mid_price + (i + 1) * tick * spread_pct * 500, 2) for i in range(depth)]

    # Power-law decay: deeper levels have less liquidity
    decay = np.exp(-0.3 * np.arange(depth))
    base  = rng.integers(500, 3000)
    bid_qty = (base * decay * rng.uniform(0.7, 1.3, depth)).astype(int)
    ask_qty = (base * decay * rng.uniform(0.7, 1.3, depth)).astype(int)

    # Occasional shock: wipe a level
    if rng.random() < 0.08:
        shock_idx = rng.integers(0, depth)
        bid_qty[shock_idx] = int(bid_qty[shock_idx] * 0.05)

    total_bid = int(bid_qty.sum())
    total_ask = int(ask_qty.sum())
    imbalance = (total_bid - total_ask) / (total_bid + total_ask + 1e-9)

    return {
        "bid_prices": bid_prices, "bid_qty": bid_qty.tolist(),
        "ask_prices": ask_prices, "ask_qty": ask_qty.tolist(),
        "mid": mid_price, "spread": ask_prices[0] - bid_prices[0],
        "imbalance": imbalance, "total_bid": total_bid, "total_ask": total_ask,
    }


def render_order_book(symbol: str, df: pd.DataFrame, quote: dict):
    st.markdown("## 📊 Real-Time Order Book")

    source_tag = "🟢 LIVE" if quote["source"] == "live" else "🟡 SIMULATED"
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("Last Price", f"₹{quote['price']:,.2f}",
                  delta=f"{quote['change']:+.2f} ({quote['pct']:+.2f}%)")
    with col2:
        vol_today = int(df["Volume"].iloc[-1])
        st.metric("Volume", f"{vol_today/1e6:.2f}M")
    with col3:
        spread_bps = df["spread_proxy"].iloc[-1] * 10000
        st.metric("Spread (bps)", f"{spread_bps:.1f}")
    with col4:
        ob = simulate_order_book(quote["price"])
        color = "#3fb950" if ob["imbalance"] > 0 else "#f78166"
        st.metric("OB Imbalance", f"{ob['imbalance']:+.3f}")
    with col5:
        st.markdown(f"<div style='margin-top:28px'>{source_tag}</div>", unsafe_allow_html=True)

    st.markdown("---")

    # Auto-refresh toggle
    auto_refresh = st.toggle("🔄 Auto-refresh order book (3s)", value=False)

    ob = simulate_order_book(quote["price"])

    col_ask, col_mid, col_bid = st.columns([2, 1, 2])

    with col_ask:
        st.markdown("### 🔴 Ask Side")
        ask_df = pd.DataFrame({
            "Price (₹)": [f"{p:,.2f}" for p in reversed(ob["ask_prices"])],
            "Quantity":  list(reversed(ob["ask_qty"])),
        })
        ask_df["Bar"] = ask_df["Quantity"] / ask_df["Quantity"].max()
        st.dataframe(ask_df[["Price (₹)", "Quantity"]], use_container_width=True, height=320)

    with col_mid:
        st.markdown("### Mid")
        mid_val = ob["mid"]
        spread_val = ob["spread"]
        st.markdown(f"""
        <div style='text-align:center; padding:20px; background:#161b22;
                    border-radius:8px; border:1px solid #30363d;'>
            <div style='font-size:22px; color:#58a6ff; font-weight:700;'>
                ₹{mid_val:,.2f}
            </div>
            <div style='font-size:12px; color:#8b949e; margin-top:8px;'>
                Mid Price
            </div>
            <div style='font-size:14px; color:#d29922; margin-top:12px;'>
                Spread<br/>₹{spread_val:.2f}
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_bid:
        st.markdown("### 🟢 Bid Side")
        bid_df = pd.DataFrame({
            "Price (₹)": [f"{p:,.2f}" for p in ob["bid_prices"]],
            "Quantity":  ob["bid_qty"],
        })
        st.dataframe(bid_df[["Price (₹)", "Quantity"]], use_container_width=True, height=320)

    # Depth chart
    fig = go.Figure()
    cum_bid = np.cumsum(list(reversed(ob["bid_qty"])))
    cum_ask = np.cumsum(ob["ask_qty"])

    fig.add_trace(go.Scatter(
        x=list(reversed(ob["bid_prices"])), y=cum_bid,
        fill="tozeroy", name="Bid Depth",
        line=dict(color="#3fb950", width=2),
        fillcolor="rgba(63,185,80,0.15)"
    ))
    fig.add_trace(go.Scatter(
        x=ob["ask_prices"], y=cum_ask,
        fill="tozeroy", name="Ask Depth",
        line=dict(color="#f78166", width=2),
        fillcolor="rgba(247,129,102,0.15)"
    ))
    fig.add_vline(x=ob["mid"], line_dash="dash", line_color="#58a6ff",
                  annotation_text="Mid", annotation_font_color="#58a6ff")
    fig.update_layout(**PLOTLY_TEMPLATE["layout"], title="Cumulative Order Book Depth",
                      height=340, xaxis_title="Price (₹)", yaxis_title="Cumulative Quantity")
    st.plotly_chart(fig, use_container_width=True)

    # Imbalance history (rolling 20 bars)
    imb_history = [simulate_order_book(quote["price"] * (1 + np.random.normal(0, 0.001)),
                                       seed=i)["imbalance"] for i in range(60)]
    fig2 = go.Figure()
    colors = ["#3fb950" if v > 0 else "#f78166" for v in imb_history]
    fig2.add_trace(go.Bar(y=imb_history, marker_color=colors, name="Imbalance"))
    fig2.add_hline(y=0, line_color="#8b949e", line_dash="dot")
    fig2.update_layout(**PLOTLY_TEMPLATE["layout"], title="Order Book Imbalance History (60 ticks)",
                       height=260, yaxis_title="Imbalance", xaxis_title="Tick")
    st.plotly_chart(fig2, use_container_width=True)

    if auto_refresh:
        time.sleep(3)
        st.rerun()


# ─────────────────────────────────────────────
# MODULE 2 — REGIME DETECTION
# ─────────────────────────────────────────────

@st.cache_data(ttl=600, show_spinner=False)
def fit_regime_model(symbol: str, n_regimes: int = 4):
    df   = fetch_nse_data(symbol, period="2y")
    feat = build_features(df)
    feature_cols = ["log_ret", "vol_20", "momentum", "imbalance", "spread_proxy"]
    X = feat[feature_cols].values

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    gmm = GaussianMixture(n_components=n_regimes, covariance_type="full",
                          random_state=42, max_iter=200)
    gmm.fit(Xs)

    labels = gmm.predict(Xs)
    probs  = gmm.predict_proba(Xs)
    conf   = probs.max(axis=1)

    feat = feat.copy()
    feat["regime"]     = labels
    feat["confidence"] = conf
    return feat, gmm, probs, feature_cols


REGIME_NAMES = {0: "Trending Bull", 1: "Mean-Reverting",
                2: "High Volatility", 3: "Crash / Panic"}
REGIME_COLORS = ["#3fb950", "#58a6ff", "#d29922", "#f78166"]


def get_regime_name(df_with_regimes: pd.DataFrame) -> dict:
    """Auto-label regimes by their average return and volatility."""
    summary = df_with_regimes.groupby("regime")[["log_ret","vol_20"]].mean()
    names = {}
    for idx, row in summary.iterrows():
        if row["log_ret"] > 0.001 and row["vol_20"] < 0.2:
            names[idx] = "📈 Trending Bull"
        elif row["log_ret"] < -0.001 and row["vol_20"] > 0.25:
            names[idx] = "🔴 Crash / Panic"
        elif row["vol_20"] > 0.2:
            names[idx] = "⚡ High Volatility"
        else:
            names[idx] = "↔ Mean-Reverting"
    return names


def render_regime_detection(symbol: str, n_regimes: int):
    st.markdown("## 🧠 Market Regime Detection (GMM)")

    with st.spinner("Fitting Gaussian Mixture Model on real NSE data…"):
        feat, gmm, probs, fcols = fit_regime_model(symbol, n_regimes)

    regime_names = get_regime_name(feat)

    # ── Current regime banner ──
    current_regime = int(feat["regime"].iloc[-1])
    current_conf   = feat["confidence"].iloc[-1]
    rname = regime_names.get(current_regime, f"Regime {current_regime}")
    rcolor = REGIME_COLORS[current_regime % len(REGIME_COLORS)]

    st.markdown(f"""
    <div style='background-color:#161b22; border:1px solid {rcolor};
                border-radius:10px; padding:16px; margin-bottom:16px;'>
        <span style='font-size:13px; color:#8b949e;'>CURRENT REGIME</span><br/>
        <span style='font-size:26px; font-weight:700; color:{rcolor};'>{rname}</span>
        <span style='float:right; font-size:13px; color:#8b949e; margin-top:8px;'>
            Confidence: <b style='color:#e6edf3;'>{current_conf:.1%}</b>
        </span>
    </div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns([3, 1])

    with col1:
        # Price chart coloured by regime
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=feat.index, y=feat["Close"],
            mode="lines", line=dict(color="#30363d", width=1),
            showlegend=False, name="Price"
        ))
        for r in range(n_regimes):
            mask = feat["regime"] == r
            rn   = regime_names.get(r, f"Regime {r}")
            rc   = REGIME_COLORS[r % len(REGIME_COLORS)]
            fig.add_trace(go.Scatter(
                x=feat.index[mask], y=feat["Close"][mask],
                mode="markers", marker=dict(color=rc, size=3, opacity=0.8),
                name=rn
            ))
        fig.update_layout(**PLOTLY_TEMPLATE["layout"],
                          title=f"{symbol} — Price Coloured by Detected Regime",
                          height=380, xaxis_title="Date", yaxis_title="Price (₹)")
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        # Regime distribution pie
        regime_counts = feat["regime"].value_counts().sort_index()
        labels = [regime_names.get(i, f"R{i}") for i in regime_counts.index]
        fig2 = go.Figure(go.Pie(
            labels=labels, values=regime_counts.values,
            marker_colors=REGIME_COLORS[:n_regimes],
            hole=0.4, textfont_size=11
        ))
        fig2.update_layout(**PLOTLY_TEMPLATE["layout"],
                           title="Regime Distribution", height=380)
        st.plotly_chart(fig2, use_container_width=True)

    # Regime probability over time (stacked area)
    fig3 = go.Figure()
    def hex_to_rgba(hex_color: str, alpha: float = 0.6) -> str:
        """BUG FIX: properly convert #RRGGBB to rgba(r,g,b,a)."""
        h = hex_color.lstrip("#")
        r_val, g_val, b_val = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return f"rgba({r_val},{g_val},{b_val},{alpha})"

    for r in range(n_regimes):
        rn = regime_names.get(r, f"Regime {r}")
        rc = REGIME_COLORS[r % len(REGIME_COLORS)]
        fig3.add_trace(go.Scatter(
            x=feat.index, y=probs[:, r],
            mode="lines", stackgroup="one",
            name=rn, line=dict(width=0, color=rc),
            fillcolor=hex_to_rgba(rc, 0.6)
        ))
    # BUG FIX: merge custom yaxis overrides with template yaxis to avoid
    # "multiple values for keyword argument 'yaxis'" TypeError
    fig3_layout = {**PLOTLY_TEMPLATE["layout"]}
    fig3_layout["yaxis"] = {**fig3_layout.get("yaxis", {}),
                            "tickformat": ".0%", "range": [0, 1]}
    fig3.update_layout(**fig3_layout,
                       title="Regime Probability (Stacked Area)",
                       height=300, xaxis_title="Date")
    st.plotly_chart(fig3, use_container_width=True)

    # Transition matrix
    st.markdown("### Regime Transition Matrix")
    n = n_regimes
    trans = np.zeros((n, n))
    labels_arr = feat["regime"].values
    for i in range(1, len(labels_arr)):
        trans[labels_arr[i-1], labels_arr[i]] += 1
    # Normalise rows to probabilities
    row_sums = trans.sum(axis=1, keepdims=True)
    trans_prob = np.divide(trans, row_sums, where=row_sums > 0)

    tick_labels = [regime_names.get(i, f"R{i}") for i in range(n)]
    fig4 = go.Figure(go.Heatmap(
        z=trans_prob, x=tick_labels, y=tick_labels,
        colorscale="Blues", text=np.round(trans_prob, 2),
        texttemplate="%{text}", showscale=True,
        colorbar=dict(title="Prob")
    ))
    fig4.update_layout(**PLOTLY_TEMPLATE["layout"],
                       title="Transition Probabilities (row → col)",
                       height=360, xaxis_title="To Regime", yaxis_title="From Regime")
    st.plotly_chart(fig4, use_container_width=True)

    # Per-regime statistics table
    st.markdown("### Regime Statistics")
    stats = feat.groupby("regime").agg(
        Count=("log_ret", "count"),
        Avg_Return=("log_ret", lambda x: f"{x.mean()*100:.3f}%"),
        Avg_Volatility=("vol_20", lambda x: f"{x.mean():.3f}"),
        Avg_Spread=("spread_proxy", lambda x: f"{x.mean()*10000:.1f} bps"),
        Confidence=("confidence", lambda x: f"{x.mean():.1%}")
    ).reset_index()
    stats["Regime"] = stats["regime"].map(lambda i: regime_names.get(i, f"R{i}"))
    st.dataframe(stats[["Regime","Count","Avg_Return","Avg_Volatility",
                         "Avg_Spread","Confidence"]],
                 use_container_width=True, hide_index=True)


# ─────────────────────────────────────────────
# MODULE 3 — OPTIONS PRICING
# ─────────────────────────────────────────────

def black_scholes(S, K, T, r, sigma, option_type="call"):
    if T <= 0 or sigma <= 0:
        return max(S - K, 0) if option_type == "call" else max(K - S, 0)
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    if option_type == "call":
        return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    else:
        return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)


def greeks(S, K, T, r, sigma):
    """Return Delta, Gamma, Vega, Theta (call) and Rho."""
    if T <= 0 or sigma <= 0:
        return {"Delta": 0, "Gamma": 0, "Vega": 0, "Theta": 0, "Rho": 0}
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    delta = norm.cdf(d1)
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega  = S * norm.pdf(d1) * np.sqrt(T) / 100         # per 1% move in vol
    theta = (-(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T))
             - r * K * np.exp(-r * T) * norm.cdf(d2)) / 365
    rho   = K * T * np.exp(-r * T) * norm.cdf(d2) / 100
    return {"Delta": delta, "Gamma": gamma, "Vega": vega,
            "Theta": theta, "Rho": rho}


def monte_carlo_option(S, K, T, r, sigma, n_sims=50000, n_steps=252, option_type="call"):
    """Vectorised GBM Monte Carlo for European call or put."""
    dt = T / n_steps
    Z  = np.random.standard_normal((n_steps, n_sims))
    ST = S * np.exp(np.cumsum((r - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * Z, axis=0))
    # BUG FIX: compute payoff based on option_type instead of always pricing a call
    if option_type == "put":
        payoffs = np.maximum(K - ST[-1], 0)
    else:
        payoffs = np.maximum(ST[-1] - K, 0)
    price   = np.exp(-r * T) * payoffs.mean()
    se      = payoffs.std() / np.sqrt(n_sims)
    return price, se, ST


def render_options_pricing(symbol: str):
    st.markdown("## ⚙️ Options Pricing — Black-Scholes + Monte Carlo")

    df    = fetch_nse_data(symbol, period="1y")
    quote = fetch_live_quote(symbol)
    feat  = build_features(df)

    live_vol = float(feat["vol_20"].iloc[-1])
    S0       = float(quote["price"])

    col1, col2, col3 = st.columns(3)
    with col1:
        K      = st.number_input("Strike Price (₹)", value=round(S0 * 1.02, -1),
                                 min_value=1.0, step=50.0)
        T_days = st.slider("Time to Expiry (days)", 7, 365, 30)
        T      = T_days / 365
    with col2:
        sigma  = st.slider("Implied Volatility (%)", 5, 100,
                           int(live_vol * 100), step=1) / 100
        r      = st.slider("Risk-Free Rate (%)", 0, 15, 7, step=1) / 100
    with col3:
        opt_type = st.radio("Option Type", ["Call", "Put"], horizontal=True)
        n_sims   = st.select_slider("MC Simulations",
                                    options=[10000, 25000, 50000, 100000], value=50000)

    st.markdown("---")

    bs_price  = black_scholes(S0, K, T, r, sigma, opt_type.lower())
    # BUG FIX: pass option_type directly so MC prices puts with put payoff (not a second call sim)
    mc_price, mc_se, paths = monte_carlo_option(S0, K, T, r, sigma, n_sims,
                                                option_type=opt_type.lower())

    g = greeks(S0, K, T, r, sigma)

    # ── Summary metrics ──
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("B-S Price",     f"₹{bs_price:.2f}")
    c2.metric("MC Price",      f"₹{mc_price:.2f}", delta=f"±{1.96*mc_se:.2f} (95% CI)")
    c3.metric("Delta",         f"{g['Delta']:.4f}")
    c4.metric("Gamma",         f"{g['Gamma']:.6f}")
    c5.metric("Vega (per 1%)", f"₹{g['Vega']:.4f}")

    c6, c7, c8, c9, c10 = st.columns(5)
    c6.metric("Theta (daily)", f"₹{g['Theta']:.4f}")
    c7.metric("Rho (per 1%)",  f"₹{g['Rho']:.4f}")
    c8.metric("Implied Vol",   f"{sigma:.1%}")
    c9.metric("Days to Expiry", T_days)
    c10.metric("Moneyness",    f"{'ITM' if S0>K else 'OTM'} ({S0/K:.3f})")

    col_mc, col_smile = st.columns(2)

    with col_mc:
        # MC paths
        fig = go.Figure()
        n_show = min(80, paths.shape[1])
        t_axis = np.linspace(0, T_days, paths.shape[0])
        for i in range(n_show):
            fig.add_trace(go.Scatter(
                x=t_axis, y=paths[:, i],
                mode="lines", line=dict(width=0.6, color="#58a6ff"),
                opacity=0.25, showlegend=False
            ))
        fig.add_hline(y=K, line_dash="dash", line_color="#d29922",
                      annotation_text="Strike", annotation_font_color="#d29922")
        fig.add_hline(y=S0, line_dash="dot", line_color="#3fb950",
                      annotation_text="Spot", annotation_font_color="#3fb950")
        fig.update_layout(**PLOTLY_TEMPLATE["layout"],
                          title=f"Monte Carlo Paths (showing {n_show}/{n_sims:,})",
                          height=380, xaxis_title="Days", yaxis_title="Price (₹)")
        st.plotly_chart(fig, use_container_width=True)

    with col_smile:
        # Volatility smile / surface (flat for BSM, but show price sensitivity)
        strikes  = np.linspace(S0 * 0.7, S0 * 1.3, 50)
        bs_curve = [black_scholes(S0, k, T, r, sigma, opt_type.lower()) for k in strikes]

        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(
            x=strikes, y=bs_curve, mode="lines",
            line=dict(color="#d2a8ff", width=2), name="B-S Price"
        ))
        fig2.add_vline(x=S0, line_dash="dot", line_color="#3fb950",
                       annotation_text="Spot", annotation_font_color="#3fb950")
        fig2.add_vline(x=K, line_dash="dash", line_color="#d29922",
                       annotation_text="Strike", annotation_font_color="#d29922")


# ─────────────────────────────────────────────
# MODULE 4 — LIQUIDITY SHOCK DETECTION
# ─────────────────────────────────────────────

@st.cache_data(ttl=600, show_spinner=False)
def run_liquidity_model(symbol: str):
    # Use 5y so we get ~1 200+ rows → more training signal
    df   = fetch_nse_data(symbol, period="5y")
    feat = build_features(df)

    # Separate training data (where future_ret is available) from inference data (where future_ret is NaN)
    train_feat = feat.dropna(subset=["future_ret"])
    
    # Target: next-5-day return
    X_cols = ["vol_20", "vol_5", "imbalance", "spread_proxy",
              "buy_pressure", "sell_pressure", "depth_proxy", "momentum"]
    X = train_feat[X_cols].copy()
    y = train_feat["future_ret"]

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    X_tr, X_te, y_tr, y_te = train_test_split(Xs, y, test_size=0.25,
                                               shuffle=False)  # temporal split
    from sklearn.linear_model import ElasticNet
    models = {
        "Ridge (L2)": Ridge(alpha=0.5),
        # Lower alpha so Lasso doesn't shrink all coefficients to exactly 0
        "Lasso (L1)": Lasso(alpha=0.0005, max_iter=5000),
        "ElasticNet":  ElasticNet(alpha=0.0005, l1_ratio=0.5, max_iter=5000),
    }
    results = {}
    for name, m in models.items():
        m.fit(X_tr, y_tr)
        pred = m.predict(X_te)
        ss_res = ((y_te - pred)**2).sum()
        ss_tot = ((y_te - y_te.mean())**2).sum()
        r2 = 1 - ss_res / ss_tot
        rmse = np.sqrt(((y_te - pred)**2).mean())
        results[name] = {"model": m, "pred": pred, "r2": r2,
                          "rmse": rmse, "coef": m.coef_}
                          
    # Predict upcoming 5 days (from the latest available trading day)
    # The last row of `feat` contains the most recent features (where future_ret is NaN)
    latest_row = feat.iloc[[-1]]
    latest_X = latest_row[X_cols]
    latest_Xs = scaler.transform(latest_X)
    
    latest_predictions = {}
    for name, m in models.items():
        latest_predictions[name] = m.predict(latest_Xs)[0]
        
    return feat, results, X_te, y_te, X_cols, scaler, latest_predictions

def detect_liquidity_shocks(feat: pd.DataFrame, threshold: float = 2.5) -> pd.Series:
    """Z-score based shock detection on spread proxy."""
    z = (feat["spread_proxy"] - feat["spread_proxy"].rolling(20).mean()) \
        / (feat["spread_proxy"].rolling(20).std() + 1e-9)
    return z.abs() > threshold


def monte_carlo_stress(model, X_te: np.ndarray, n_sims: int = 2000) -> np.ndarray:
    """Bootstrap Monte Carlo for PnL distribution under model uncertainty."""
    preds = np.array([
        model.predict(X_te[np.random.choice(len(X_te), len(X_te), replace=True)])
        for _ in range(n_sims)
    ])
    return preds


def render_liquidity_shock(symbol: str):
    st.markdown("## 💥 Liquidity Shock Detection & Stress Testing")

    with st.spinner("Running ML models on NSE data…"):
        feat, results, X_te, y_te, xcols, scaler, latest_preds = run_liquidity_model(symbol)

    shocks = detect_liquidity_shocks(feat)
    n_shocks = int(shocks.sum())
    shock_pct = n_shocks / len(feat) * 100

    # ── Summary ──
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Liquidity Shocks Detected", n_shocks)
    col2.metric("Shock Frequency", f"{shock_pct:.1f}%")
    col3.metric("Avg Spread (normal)", f"{feat.loc[~shocks,'spread_proxy'].mean()*10000:.1f} bps")
    col4.metric("Avg Spread (shock)", f"{feat.loc[shocks,'spread_proxy'].mean()*10000:.1f} bps"
                if n_shocks else "N/A")

    st.markdown("---")

    # ── Spread with shock annotations ──
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=feat.index, y=feat["spread_proxy"] * 10000,
        mode="lines", line=dict(color="#58a6ff", width=1), name="Spread (bps)"
    ))
    if n_shocks > 0:
        fig.add_trace(go.Scatter(
            x=feat.index[shocks], y=feat["spread_proxy"][shocks] * 10000,
            mode="markers", marker=dict(color="#f78166", size=6, symbol="x"),
            name="Liquidity Shock"
        ))
    fig.update_layout(**PLOTLY_TEMPLATE["layout"],
                      title="Intraday Spread Proxy (bps) with Shock Detection",
                      height=300, xaxis_title="Date", yaxis_title="Spread (bps)")
    st.plotly_chart(fig, use_container_width=True)

    # ── Current 5-Day Forecast ──
    best_name = max(results, key=lambda k: results[k]["r2"])
    best = results[best_name]
    pred_val = latest_preds[best_name]
    pred_pct = (np.exp(pred_val) - 1) * 100
    
    st.markdown("### 🔮 Next 5-Day Market Direction Forecast")
    latest_date = feat.index[-1].strftime('%B %d, %Y')
    direction = "📈 BULLISH" if pred_pct > 0 else "📉 BEARISH"
    color = "#3fb950" if pred_pct > 0 else "#f78166"
    
    st.markdown(f"""
    <div style="background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <div style="font-size: 13px; color: #8b949e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Latest Model Signal (Market Close of {latest_date})</div>
        <div style="display: flex; align-items: baseline; gap: 15px;">
            <span style="font-size: 26px; font-weight: 700; color: {color};">{direction}</span>
            <span style="font-size: 22px; font-weight: 600; color: #e6edf3;">{pred_pct:+.2f}%</span>
        </div>
        <div style="font-size: 12px; color: #8b949e; margin-top: 10px; font-family: monospace;">
            Expected cumulative log-return: {pred_val:+.6f} | Generated by best model: <strong>{best_name}</strong> (Test R²: {best['r2']:.4f})
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Model comparison ──
    st.markdown("### Model Comparison")
    perf = pd.DataFrame([
        {"Model": k, "R²": f"{v['r2']:.4f}", "RMSE": f"{v['rmse']:.6f}"}
        for k, v in results.items()
    ])
    st.dataframe(perf, use_container_width=True, hide_index=True)

    best_name = max(results, key=lambda k: results[k]["r2"])
    best = results[best_name]

    col_pred, col_feat = st.columns(2)

    with col_pred:
        # Use actual-return range for both axes so the perfect-fit line
        # and data points occupy the same space (fixes 'line is far' bug)
        act_mn = float(y_te.min()) * 1.15
        act_mx = float(y_te.max()) * 1.15
        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(
            x=y_te.values, y=best["pred"],
            mode="markers", marker=dict(color="#58a6ff", size=5, opacity=0.6),
            name="Predicted vs Actual"
        ))
        # Perfect-fit reference — spans actual-return range only
        fig2.add_trace(go.Scatter(
            x=[act_mn, act_mx], y=[act_mn, act_mx],
            mode="lines", line=dict(color="#8b949e", dash="dash"),
            name="Perfect Fit (y=x)"
        ))
        # Zero-prediction baseline (gold dotted) shows naive model level
        fig2.add_hline(y=0, line_dash="dot", line_color="#d29922",
                       annotation_text="Zero-prediction",
                       annotation_font_color="#d29922",
                       annotation_position="bottom right")
        fig2_layout = {**PLOTLY_TEMPLATE["layout"]}
        fig2_layout["xaxis"] = {**fig2_layout.get("xaxis", {}),
                                 "range": [act_mn, act_mx]}
        fig2_layout["yaxis"] = {**fig2_layout.get("yaxis", {}),
                                 "range": [act_mn, act_mx]}
        fig2.update_layout(**fig2_layout,
                           title=f"Predicted vs Actual — {best_name}  (R²={best['r2']:.4f})",
                           height=360, xaxis_title="Actual Return",
                           yaxis_title="Predicted Return")
        st.plotly_chart(fig2, use_container_width=True)

    with col_feat:
        coef_df = pd.DataFrame({
            "Feature": xcols,
            "Importance": np.abs(best["coef"])
        }).sort_values("Importance", ascending=True)

        fig3 = go.Figure(go.Bar(
            x=coef_df["Importance"], y=coef_df["Feature"],
            orientation="h", marker_color="#3fb950"
        ))
        fig3.update_layout(**PLOTLY_TEMPLATE["layout"],
                           title=f"Feature Importance — {best_name}",
                           height=360, xaxis_title="|Coefficient|")
        st.plotly_chart(fig3, use_container_width=True)

    # ── Monte Carlo PnL Stress Test ──
    st.markdown("### Monte Carlo Stress Test — PnL Distribution")
    n_sims = st.slider("Simulations", 500, 5000, 2000, step=500,
                       key="mc_stress_sims")
    with st.spinner(f"Running {n_sims} bootstrap scenarios…"):
        mc = monte_carlo_stress(best["model"], X_te, n_sims)
    pnl = mc.sum(axis=1) * 10000   # scale to bps

    var_95  = np.percentile(pnl, 5)
    cvar_95 = pnl[pnl <= var_95].mean()

    cv1, cv2, cv3, cv4 = st.columns(4)
    cv1.metric("Mean PnL (bps)",   f"{pnl.mean():.2f}")
    cv2.metric("Std Dev (bps)",    f"{pnl.std():.2f}")
    cv3.metric("VaR 95% (bps)",    f"{var_95:.2f}")
    cv4.metric("CVaR 95% (bps)",   f"{cvar_95:.2f}")

    fig4 = go.Figure()
    fig4.add_trace(go.Histogram(
        x=pnl, nbinsx=80, marker_color="#58a6ff",
        opacity=0.75, name="PnL Distribution"
    ))
    fig4.add_vline(x=var_95,  line_dash="dash", line_color="#d29922",
                   annotation_text="VaR 95%", annotation_font_color="#d29922")
    fig4.add_vline(x=cvar_95, line_dash="dash", line_color="#f78166",
                   annotation_text="CVaR 95%", annotation_font_color="#f78166")
    fig4.add_vline(x=pnl.mean(), line_dash="dot", line_color="#3fb950",
                   annotation_text="Mean", annotation_font_color="#3fb950")
    fig4.update_layout(**PLOTLY_TEMPLATE["layout"],
                       title=f"Simulated PnL Distribution ({n_sims:,} scenarios)",
                       height=360, xaxis_title="PnL (bps)", yaxis_title="Frequency")
    st.plotly_chart(fig4, use_container_width=True)

    # Volatility timeline with shock overlay
    fig5 = go.Figure()
    fig5.add_trace(go.Scatter(
        x=feat.index, y=feat["vol_20"],
        mode="lines", line=dict(color="#d2a8ff", width=1.5), name="20-day Vol"
    ))
    fig5.add_trace(go.Scatter(
        x=feat.index, y=feat["vol_5"],
        mode="lines", line=dict(color="#79c0ff", width=1, dash="dot"), name="5-day Vol"
    ))
    if n_shocks > 0:
        fig5.add_trace(go.Scatter(
            x=feat.index[shocks], y=feat["vol_20"][shocks],
            mode="markers", marker=dict(color="#f78166", size=5, symbol="diamond"),
            name="Shock"
        ))
    fig5.update_layout(**PLOTLY_TEMPLATE["layout"],
                       title="Realised Volatility with Liquidity Shock Events",
                       height=280, xaxis_title="Date", yaxis_title="Annualised Vol")
    st.plotly_chart(fig5, use_container_width=True)


# ─────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────

def render_sidebar():
    st.sidebar.markdown("""
    <div style='text-align:center; padding:12px 0;'>
        <div style='font-size:22px; font-weight:700; color:#58a6ff;'>
            📈 NSE Quant Platform
        </div>
        <div style='font-size:11px; color:#8b949e; margin-top:4px;'>
            Powered by yfinance · GMM · Black-Scholes
        </div>
    </div>
    """, unsafe_allow_html=True)
    st.sidebar.markdown("---")

    st.sidebar.markdown("### 🎯 Instrument")
    symbol_options = {
        "NIFTY 50 (^NSEI)":        "^NSEI",
        "Reliance Industries":      "RELIANCE.NS",
        "TCS":                      "TCS.NS",
        "Infosys":                  "INFY.NS",
        "HDFC Bank":                "HDFCBANK.NS",
        "Wipro":                    "WIPRO.NS",
        "ICICI Bank":               "ICICIBANK.NS",
        "Bajaj Finance":            "BAJFINANCE.NS",
    }
    selected_label = st.sidebar.selectbox("Select Symbol", list(symbol_options.keys()))
    symbol = symbol_options[selected_label]

    st.sidebar.markdown("### 🔬 GMM Regimes")
    n_regimes = st.sidebar.slider("Number of Regimes", 2, 6, 4)

    st.sidebar.markdown("---")
    st.sidebar.markdown("""
    <div style='font-size:11px; color:#8b949e; line-height:1.6;'>
        <b style='color:#e6edf3;'>Data Source</b><br/>
        NSE/BSE via Yahoo Finance.<br/>
        Auto-refreshes every 5 min.<br/><br/>
        <b style='color:#e6edf3;'>Models</b><br/>
        • GMM (regime detection)<br/>
        • Black-Scholes + MC (options)<br/>
        • Ridge / Lasso (liquidity)<br/>
        • Z-score (shock detection)<br/><br/>
        <b style='color:#e6edf3;'>Install</b><br/>
        <code style='color:#58a6ff;'>pip install -r requirements.txt</code><br/>
        <code style='color:#58a6ff;'>streamlit run dashboard.py</code>
    </div>
    """, unsafe_allow_html=True)

    return symbol, n_regimes


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    symbol, n_regimes = render_sidebar()

    # Header
    st.markdown(f"""
    <div style='display:flex; align-items:center; margin-bottom:8px;'>
        <h1 style='margin:0;'>NSE Quantitative Finance Platform</h1>
        <span class='live-badge'>LIVE</span>
    </div>
    <div style='color:#8b949e; font-size:13px; margin-bottom:20px;'>
        Real-time order book · Regime detection · Options pricing · Liquidity stress testing
    </div>
    """, unsafe_allow_html=True)

    # Fetch quote once for all modules
    with st.spinner(f"Fetching {symbol} data…"):
        df    = fetch_nse_data(symbol)
        quote = fetch_live_quote(symbol)
        feat  = build_features(df)

    source_note = "✅ Live NSE data via Yahoo Finance" if quote["source"] == "live" \
                  else "⚠️ Demo mode — realistic synthetic data (no internet access)"
    if quote["source"] == "live":
        st.success(source_note)
    else:
        st.warning(source_note)

    # Tabs
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Order Book",
        "🧠 Regime Detection",
        "⚙️ Options Pricing",
        "💥 Liquidity Shocks"
    ])

    with tab1:
        render_order_book(symbol, feat, quote)

    with tab2:
        render_regime_detection(symbol, n_regimes)

    with tab3:
        render_options_pricing(symbol)

    with tab4:
        render_liquidity_shock(symbol)


if __name__ == "__main__":
    main()
