"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Eye, BarChart3, Activity } from "lucide-react";
import {
  useMarketKPIs,
  useWatchlist,
  useNiftyHistorical,
  useSectorPerformance,
  useMarketMovers,
  useMarketBreadth,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { GlassCard } from "@/components/common/GlassCard";
import { PriceBadge } from "@/components/common/PriceBadge";
import { Sparkline } from "@/components/common/Ticker";
import { LightweightChart } from "@/components/charts/LightweightChart";
import { SectorBars } from "@/components/charts/SectorBars";
import { AllocationRing } from "@/components/charts/AllocationRing";
import { formatPrice, cn } from "@/lib/utils";

const stagger = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

export function Dashboard() {
  const { data: kpis } = useMarketKPIs();
  const { data: watchlist = [] } = useWatchlist();
  const { data: ohlcv = [] } = useNiftyHistorical();
  const { data: sectors = [] } = useSectorPerformance();
  const { data: movers } = useMarketMovers();
  const { data: breadth } = useMarketBreadth();
  const { selectedTimeframe, setSelectedTimeframe } = useAppStore();

  const kpiCards = kpis
    ? [
        { label: "NIFTY 50", value: kpis.nifty.value, change: kpis.nifty.change, icon: Activity, color: "var(--accent-primary)" },
        { label: "SENSEX", value: kpis.sensex.value, change: kpis.sensex.change, icon: BarChart3, color: "var(--accent-secondary)" },
        { label: "INDIA VIX", value: kpis.vix.value, change: kpis.vix.change, icon: Eye, color: "var(--accent-gold)" },
        { label: "ADV/DEC", value: kpis.advancesDeclines.advances, change: 0, icon: TrendingUp, color: "var(--accent-emerald)" },
      ]
    : [];

  const breadthSegments = breadth
    ? [
        { label: "Advances", value: breadth.advances, color: "var(--accent-emerald)" },
        { label: "Declines", value: breadth.declines, color: "var(--accent-crimson)" },
        { label: "Unchanged", value: breadth.unchanged, color: "var(--text-tertiary)" },
      ]
    : [];

  const timeframes = ["1D", "1W", "1M", "3M", "6M", "1Y"];

  return (
    <section id="dashboard" className="relative py-24">
      <div className="mx-auto max-w-[1440px] px-6">
        {/* Section header */}
        <motion.div {...stagger} className="mb-12">
          <span className="text-label mb-3 block">Market Overview</span>
          <h2 className="text-heading">
            Live <span className="text-gradient">Dashboard</span>
          </h2>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          {...stagger}
          transition={{ ...stagger.transition, delay: 0.1 }}
          className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <GlassCard key={kpi.label}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Icon size={14} style={{ color: kpi.color }} />
                      <span className="text-label">{kpi.label}</span>
                    </div>
                    <div className="font-display text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                      {typeof kpi.value === "number" ? formatPrice(kpi.value) : kpi.value}
                    </div>
                  </div>
                  <PriceBadge value={kpi.change} />
                </div>
              </GlassCard>
            );
          })}
        </motion.div>

        {/* Main grid: Chart + Sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: NIFTY Chart */}
          <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.2 }}>
            <GlassCard noPadding className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">NIFTY 50</h3>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>NSE Index</span>
                </div>
                <div className="flex gap-1">
                  {timeframes.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf)}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-all duration-200",
                        selectedTimeframe === tf
                          ? "bg-[rgba(108,99,255,0.15)] text-[var(--accent-primary)]"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {ohlcv.length > 0 && <LightweightChart data={ohlcv} height={360} />}
              </div>
            </GlassCard>
          </motion.div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Watchlist */}
            <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.3 }}>
              <GlassCard noPadding>
                <div className="border-b border-[var(--glass-border)] px-5 py-3">
                  <h3 className="font-display text-sm font-semibold">Watchlist</h3>
                </div>
                <div className="divide-y divide-[var(--glass-border)]">
                  {watchlist.map((item) => (
                    <div
                      key={item.symbol}
                      className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <div>
                        <span className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {item.symbol}
                        </span>
                        <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sparkline data={item.sparkline} width={48} height={18} />
                        <div className="text-right">
                          <div className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                            ₹{formatPrice(item.price)}
                          </div>
                          <PriceBadge value={item.changePercent} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Market Breadth Donut */}
            {breadthSegments.length > 0 && (
              <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.4 }}>
                <GlassCard className="flex flex-col items-center">
                  <h3 className="text-label mb-4 self-start">Market Breadth</h3>
                  <AllocationRing
                    segments={breadthSegments}
                    size={160}
                    strokeWidth={20}
                  />
                  <div className="mt-4 flex gap-4">
                    {breadthSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: seg.color }}
                        />
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {seg.label}: {seg.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom row: Sectors + Top Movers */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Sector Performance */}
          <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.5 }}>
            <GlassCard>
              <h3 className="text-label mb-4">Sector Performance</h3>
              <SectorBars sectors={sectors} />
            </GlassCard>
          </motion.div>

          {/* Top Movers */}
          <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.6 }}>
            <GlassCard noPadding>
              <div className="grid grid-cols-2 divide-x divide-[var(--glass-border)]">
                {/* Gainers */}
                <div>
                  <div className="border-b border-[var(--glass-border)] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} style={{ color: "var(--accent-emerald)" }} />
                      <span className="text-label" style={{ color: "var(--accent-emerald)" }}>Top Gainers</span>
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--glass-border)]">
                    {(movers?.gainers ?? []).map((mover) => (
                      <div key={mover.symbol} className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-mono text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          {mover.symbol}
                        </span>
                        <PriceBadge value={mover.changePercent} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Losers */}
                <div>
                  <div className="border-b border-[var(--glass-border)] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TrendingDown size={14} style={{ color: "var(--accent-crimson)" }} />
                      <span className="text-label" style={{ color: "var(--accent-crimson)" }}>Top Losers</span>
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--glass-border)]">
                    {(movers?.losers ?? []).map((mover) => (
                      <div key={mover.symbol} className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-mono text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          {mover.symbol}
                        </span>
                        <PriceBadge value={mover.changePercent} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
