"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, BarChart3, Shield, Zap } from "lucide-react";
import { useMarketTickers, useMarketKPIs } from "@/lib/api";
import { TickerStrip } from "@/components/common/Ticker";
import { GlassCard } from "@/components/common/GlassCard";
import { formatPrice, formatPercent, getDeltaSymbol } from "@/lib/utils";
import { gsap, EASE_OUT_EXPO } from "@/lib/gsap";

const STAT_CARDS = [
  { label: "NIFTY 50", icon: TrendingUp, color: "var(--accent-primary)" },
  { label: "SENSEX", icon: BarChart3, color: "var(--accent-secondary)" },
  { label: "INDIA VIX", icon: Shield, color: "var(--accent-gold)" },
  { label: "ADVANCES", icon: Zap, color: "var(--accent-emerald)" },
];

export function Hero() {
  const { data: tickers = [] } = useMarketTickers();
  const { data: kpis } = useMarketKPIs();
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.4 });

    if (headlineRef.current) {
      tl.fromTo(
        headlineRef.current.querySelectorAll(".word"),
        { y: "110%", opacity: 0 },
        { y: "0%", opacity: 1, duration: 0.8, ease: EASE_OUT_EXPO, stagger: 0.08 }
      );
    }

    if (subtitleRef.current) {
      tl.fromTo(
        subtitleRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: EASE_OUT_EXPO },
        "-=0.4"
      );
    }
  }, []);

  const kpiValues = kpis
    ? [
        { value: formatPrice(kpis.nifty.value), change: kpis.nifty.change },
        { value: formatPrice(kpis.sensex.value), change: kpis.sensex.change },
        { value: kpis.vix.value.toFixed(2), change: kpis.vix.change },
        { value: `${kpis.advancesDeclines.advances}`, change: ((kpis.advancesDeclines.advances / (kpis.advancesDeclines.advances + kpis.advancesDeclines.declines)) * 100 - 50) },
      ]
    : [
        { value: "22,456.80", change: 1.24 },
        { value: "73,852.94", change: 1.14 },
        { value: "13.42", change: -4.56 },
        { value: "1,247", change: 14.2 },
      ];

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden">
      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col items-center justify-center px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <span className="pill pill-accent">
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            Real-Time NSE Analytics
          </span>
        </motion.div>

        {/* Headline */}
        <h1 ref={headlineRef} className="text-hero mb-6 max-w-[900px]">
          {["Quantitative", "Finance,", "Reimagined"].map((word, i) => (
            <span
              key={i}
              className="inline-block overflow-hidden"
              style={{ verticalAlign: "top" }}
            >
              <span
                className={`word inline-block ${i === 2 ? "text-gradient" : ""}`}
                style={{ transform: "translateY(110%)", opacity: 0 }}
              >
                {word}
                {i < 2 ? "\u00A0" : ""}
              </span>
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="mb-10 max-w-[600px] text-lg leading-relaxed"
          style={{ color: "var(--text-secondary)", opacity: 0 }}
        >
          Order book simulation, GMM regime detection, Black-Scholes pricing,
          and ML liquidity shock analysis — all in one cinematic interface.
        </p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a href="/dashboard" className="btn-primary">
            Launch Dashboard
            <ArrowRight size={16} />
          </a>
          <a href="/analytics" className="btn-secondary">
            Explore Analytics
          </a>
        </motion.div>

        {/* Floating stat cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 grid w-full max-w-[900px] grid-cols-2 gap-4 md:grid-cols-4"
        >
          {STAT_CARDS.map((card, i) => {
            const kpi = kpiValues[i];
            const isPositive = kpi.change >= 0;

            return (
              <GlassCard
                key={card.label}
                className="text-left"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <card.icon size={14} style={{ color: card.color }} />
                  <span className="text-label">{card.label}</span>
                </div>
                <div className="font-display text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {card.label === "INDIA VIX" ? kpi.value : `₹${kpi.value}`}
                </div>
                <div
                  className="mt-1 font-mono text-xs font-medium"
                  style={{
                    color: isPositive ? "var(--accent-emerald)" : "var(--accent-crimson)",
                  }}
                >
                  {getDeltaSymbol(kpi.change)} {formatPercent(kpi.change)}
                </div>
              </GlassCard>
            );
          })}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              Scroll to explore
            </span>
            <div
              className="h-8 w-[1px] rounded-full"
              style={{
                background: "linear-gradient(to bottom, var(--accent-primary), transparent)",
                animation: "scroll-dot 2s ease-in-out infinite",
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Ticker strip at bottom of hero */}
      <div className="absolute bottom-0 left-0 right-0">
        {tickers.length > 0 && <TickerStrip tickers={tickers} />}
      </div>
    </section>
  );
}
