"use client";

import React from "react";
import { cn, formatPrice, formatPercent, getDeltaSymbol } from "@/lib/utils";

interface TickerProps {
  symbol: string;
  price: number;
  changePercent: number;
  compact?: boolean;
  className?: string;
}

export function Ticker({
  symbol,
  price,
  changePercent,
  compact = false,
  className,
}: TickerProps) {
  const isPositive = changePercent >= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 font-mono whitespace-nowrap",
        className
      )}
    >
      <span
        className="font-semibold"
        style={{ color: "var(--accent-secondary)" }}
      >
        {symbol}
      </span>

      {!compact && (
        <span style={{ color: "var(--text-primary)" }}>
          ₹{formatPrice(price)}
        </span>
      )}

      <span
        className={cn("text-xs font-medium")}
        style={{
          color: isPositive ? "var(--accent-emerald)" : "var(--accent-crimson)",
        }}
      >
        {getDeltaSymbol(changePercent)} {formatPercent(changePercent)}
      </span>
    </div>
  );
}

/* Ticker marquee strip */
interface TickerStripProps {
  tickers: {
    symbol: string;
    price: number;
    changePercent: number;
  }[];
  className?: string;
}

export function TickerStrip({ tickers, className }: TickerStripProps) {
  // Double the tickers for seamless loop
  const doubled = [...tickers, ...tickers];

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "border-y border-[var(--glass-border)]",
        "bg-[rgba(5,5,8,0.6)]",
        className
      )}
    >
      <div
        className="flex items-center gap-8 py-3 px-4"
        style={{
          animation: "marquee 40s linear infinite",
          width: "max-content",
        }}
      >
        {doubled.map((ticker, i) => (
          <Ticker
            key={`${ticker.symbol}-${i}`}
            symbol={ticker.symbol}
            price={ticker.price}
            changePercent={ticker.changePercent}
          />
        ))}
      </div>
    </div>
  );
}

/* Mini sparkline SVG for watchlist */
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 60,
  height = 24,
  color,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor =
    color || (isPositive ? "var(--accent-emerald)" : "var(--accent-crimson)");

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
