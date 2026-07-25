"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  CandlestickChart,
  LineChart,
  AreaChart,
  Activity,
  Brain,
  Loader2,
} from "lucide-react";
import {
  useStockOHLCV,
  useIndicators,
  useAIAnalysis,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { GlassCard } from "@/components/common/GlassCard";
import { LightweightChart } from "@/components/charts/LightweightChart";
import { cn, formatPercent } from "@/lib/utils";

const stagger = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const CHART_TYPES = [
  { type: "candles" as const, label: "Candles", icon: CandlestickChart },
  { type: "line" as const, label: "Line", icon: LineChart },
  { type: "area" as const, label: "Area", icon: AreaChart },
  { type: "bars" as const, label: "Bars", icon: BarChart3 },
];

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "6M", "1Y"];

const INDICATORS = ["RSI", "MACD", "Bollinger", "EMA20", "SMA50", "VWAP"];

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(interval);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span
          className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
          style={{
            background: "var(--accent-primary)",
            animation: "typewriter-cursor 1s ease-in-out infinite",
          }}
        />
      )}
    </span>
  );
}

export function Analytics() {
  const {
    selectedStock,
    selectedTimeframe,
    setSelectedTimeframe,
    selectedChartType,
    setSelectedChartType,
    activeIndicators,
    toggleIndicator,
  } = useAppStore();

  const { data: ohlcv = [] } = useStockOHLCV(selectedStock.symbol, selectedTimeframe);
  const { data: indicators } = useIndicators(selectedStock.symbol, selectedTimeframe);
  const aiAnalysis = useAIAnalysis();

  const handleAIAnalyze = () => {
    aiAnalysis.mutate({
      symbol: selectedStock.symbol,
      timeframe: selectedTimeframe,
    });
  };

  return (
    <section id="analytics" className="relative pt-20 pb-24">
      <div className="mx-auto max-w-[1440px] px-6">
        {/* Section header */}
        <motion.div {...stagger} className="mb-12">
          <span className="text-label mb-3 block">Technical Analysis</span>
          <h2 className="text-heading">
            Advanced <span className="text-gradient">Analytics</span>
          </h2>
        </motion.div>

        {/* Controls bar */}
        <motion.div
          {...stagger}
          transition={{ ...stagger.transition, delay: 0.1 }}
          className="mb-6 flex flex-wrap items-center gap-4"
        >
          {/* Stock name */}
          <div className="mr-auto">
            <span className="font-display text-lg font-semibold">{selectedStock.name}</span>
            <span className="ml-2 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              {selectedStock.symbol}
            </span>
          </div>

          {/* Chart type selector */}
          <div className="flex gap-1 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] p-1">
            {CHART_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setSelectedChartType(type)}
                title={label}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                  selectedChartType === type
                    ? "bg-[rgba(108,99,255,0.15)] text-[var(--accent-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex gap-1 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] p-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 font-mono text-[11px] font-medium transition-all duration-200",
                  selectedTimeframe === tf
                    ? "bg-[rgba(108,99,255,0.15)] text-[var(--accent-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Chart area */}
          <div className="space-y-4">
            {/* Main chart */}
            <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.2 }}>
              <GlassCard noPadding>
                <div className="p-4">
                  {ohlcv.length > 0 && <LightweightChart data={ohlcv} height={420} />}
                </div>
              </GlassCard>
            </motion.div>

            {/* Indicator panels */}
            <AnimatePresence>
              {activeIndicators.includes("RSI") && indicators?.rsi && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <GlassCard noPadding>
                    <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-2">
                      <span className="text-label">RSI (14)</span>
                      <span
                        className="font-mono text-xs"
                        style={{
                          color: (indicators.rsi as number[])?.[((indicators.rsi as number[]).length ?? 1) - 1] > 70
                            ? "var(--accent-crimson)"
                            : (indicators.rsi as number[])?.[((indicators.rsi as number[]).length ?? 1) - 1] < 30
                              ? "var(--accent-emerald)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {((indicators.rsi as number[])?.[((indicators.rsi as number[]).length ?? 1) - 1] ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <svg viewBox="0 0 400 80" className="w-full" preserveAspectRatio="none">
                        {/* Overbought/Oversold bands */}
                        <rect x="0" y="0" width="400" height={80 * 0.3} fill="rgba(255,59,107,0.05)" />
                        <rect x="0" y={80 * 0.7} width="400" height={80 * 0.3} fill="rgba(0,229,160,0.05)" />
                        <line x1="0" y1={80 * 0.3} x2="400" y2={80 * 0.3} stroke="rgba(255,59,107,0.2)" strokeDasharray="4" />
                        <line x1="0" y1={80 * 0.7} x2="400" y2={80 * 0.7} stroke="rgba(0,229,160,0.2)" strokeDasharray="4" />

                        <polyline
                          fill="none"
                          stroke="var(--accent-primary)"
                          strokeWidth="1.5"
                          points={(indicators.rsi as number[])
                            .map((v: number, i: number) => `${(i / ((indicators.rsi as number[]).length - 1)) * 400},${80 - (v / 100) * 80}`)
                            .join(" ")}
                        />
                      </svg>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Indicator toggles */}
            <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.3 }}>
              <GlassCard>
                <h3 className="text-label mb-3">Indicators</h3>
                <div className="flex flex-wrap gap-2">
                  {INDICATORS.map((ind) => {
                    const active = activeIndicators.includes(ind);
                    return (
                      <button
                        key={ind}
                        onClick={() => toggleIndicator(ind)}
                        className={cn(
                          "rounded-full px-3 py-1 font-mono text-[11px] font-medium transition-all duration-200 border",
                          active
                            ? "border-[var(--accent-primary)] bg-[rgba(108,99,255,0.12)] text-[var(--accent-primary)]"
                            : "border-[var(--glass-border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--glass-shine)]"
                        )}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>

            {/* AI Analysis */}
            <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.4 }}>
              <GlassCard>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={16} style={{ color: "var(--accent-secondary)" }} />
                    <h3 className="text-label" style={{ color: "var(--accent-secondary)" }}>
                      AI Analysis
                    </h3>
                  </div>
                  <button
                    onClick={handleAIAnalyze}
                    disabled={aiAnalysis.isPending}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-200",
                      "border border-[var(--accent-secondary)] text-[var(--accent-secondary)]",
                      "hover:bg-[rgba(0,212,255,0.1)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {aiAnalysis.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Activity size={12} />
                    )}
                    Analyze
                  </button>
                </div>

                {aiAnalysis.data ? (
                  <div>
                    {/* Signal badge */}
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={cn(
                          "pill",
                          aiAnalysis.data.signal === "Bullish"
                            ? "pill-positive"
                            : aiAnalysis.data.signal === "Bearish"
                              ? "pill-negative"
                              : "pill-neutral"
                        )}
                      >
                        {aiAnalysis.data.signal}
                      </span>
                      <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                        {formatPercent(aiAnalysis.data.confidence * 100).replace("+", "")} confidence
                      </span>
                    </div>

                    {/* Analysis text with typewriter */}
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      <TypewriterText text={aiAnalysis.data.summary} />
                    </p>

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {aiAnalysis.data.tags.map((tag: string) => (
                        <span key={tag} className="pill pill-accent text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Click &ldquo;Analyze&rdquo; to get AI-powered technical analysis
                    for {selectedStock.name}.
                  </p>
                )}
              </GlassCard>
            </motion.div>

            {/* MACD mini chart */}
            <AnimatePresence>
              {activeIndicators.includes("MACD") && indicators?.macd && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <GlassCard>
                    <h3 className="text-label mb-3">MACD</h3>
                    <svg viewBox="0 0 280 60" className="w-full" preserveAspectRatio="none">
                      {/* Histogram */}
                      {(indicators.macd as { histogram: number[] }).histogram.map((v: number, i: number) => {
                        const x = (i / ((indicators.macd as { histogram: number[] }).histogram.length - 1)) * 280;
                        const h = Math.abs(v) / 20 * 30;
                        return (
                          <rect
                            key={i}
                            x={x - 1.5}
                            y={v >= 0 ? 30 - h : 30}
                            width={3}
                            height={h}
                            fill={v >= 0 ? "rgba(0,229,160,0.4)" : "rgba(255,59,107,0.4)"}
                          />
                        );
                      })}
                      {/* MACD line */}
                      <polyline
                        fill="none"
                        stroke="var(--accent-primary)"
                        strokeWidth="1"
                        points={(indicators.macd as { macd: number[] }).macd
                          .map((v: number, i: number) => `${(i / ((indicators.macd as { macd: number[] }).macd.length - 1)) * 280},${30 - (v / 50) * 25}`)
                          .join(" ")}
                      />
                      {/* Signal line */}
                      <polyline
                        fill="none"
                        stroke="var(--accent-gold)"
                        strokeWidth="1"
                        points={(indicators.macd as { signal: number[] }).signal
                          .map((v: number, i: number) => `${(i / ((indicators.macd as { signal: number[] }).signal.length - 1)) * 280},${30 - (v / 50) * 25}`)
                          .join(" ")}
                      />
                    </svg>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
