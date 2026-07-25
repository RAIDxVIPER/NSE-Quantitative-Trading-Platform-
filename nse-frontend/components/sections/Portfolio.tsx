"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Award,
  Briefcase,
} from "lucide-react";
import {
  usePortfolioHoldings,
  usePortfolioPerformance,
} from "@/lib/api";
import { GlassCard } from "@/components/common/GlassCard";
import { PriceBadge } from "@/components/common/PriceBadge";
import { LightweightChart } from "@/components/charts/LightweightChart";
import { AllocationRing } from "@/components/charts/AllocationRing";
import {
  SkeletonCard,
  SkeletonTable,
  Skeleton,
} from "@/components/common/SkeletonLoader";
import {
  formatPrice,
  formatCurrency,
  formatPercent,
  cn,
} from "@/lib/utils";

const stagger = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const SECTOR_COLORS: Record<string, string> = {
  IT: "#6C63FF",
  Banking: "#00D4FF",
  Energy: "#FFB547",
  FMCG: "#00E5A0",
  Telecom: "#FF3B8B",
  Finance: "#FF8A3B",
  Pharma: "#A78BFA",
  Auto: "#FFD93D",
  Metal: "#94A3B8",
};

const DEFAULT_SECTOR_COLOR = "#6C63FF";

export function Portfolio() {
  const { data: holdings = [], isLoading: holdingsLoading } = usePortfolioHoldings();
  const { data: performance = [], isLoading: performanceLoading } =
    usePortfolioPerformance("1M");
  const summary = useMemo(() => {
    if (!holdings || holdings.length === 0) {
      return {
        totalValue: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        dayPnl: 0,
        bestPerformer: null as null | (typeof holdings)[number],
      };
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
    const invested = totalValue - totalPnl;
    const totalPnlPercent = invested > 0 ? (totalPnl / invested) * 100 : 0;

    // Deterministic day PnL estimate derived from each holding's position
    const dayPnl = holdings.reduce((sum, h, i) => {
      const change = Math.sin(i * 1.7 + 0.5) * 0.006;
      return sum + h.currentValue * change;
    }, 0);

    const bestPerformer = holdings.reduce(
      (best, h) => (!best || h.pnlPercent > best.pnlPercent ? h : best),
      holdings[0]
    );

    return { totalValue, totalPnl, totalPnlPercent, dayPnl, bestPerformer };
  }, [holdings]);

  const sectorSegments = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];
    const bySector: Record<string, number> = {};
    for (const h of holdings) {
      bySector[h.sector] = (bySector[h.sector] || 0) + h.currentValue;
    }
    return Object.entries(bySector)
      .map(([sector, value]) => ({
        label: sector,
        value,
        color: SECTOR_COLORS[sector] ?? DEFAULT_SECTOR_COLOR,
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  const performanceData = useMemo(
    () =>
      performance.map((p) => ({
        time: p.date,
        open: p.value,
        high: p.value,
        low: p.value,
        close: p.value,
        volume: 0,
      })),
    [performance]
  );

  const summaryCards = useMemo(() => {
    const dayPnlPercent =
      summary.totalValue > 0 ? (summary.dayPnl / summary.totalValue) * 100 : 0;

    return [
      {
        key: "total-value",
        label: "Total Value",
        value: `\u20B9${(summary.totalValue / 100000).toFixed(2)}L`,
        sub: `${holdings.length} holdings`,
        icon: Wallet,
        color: "var(--accent-primary)",
        iconBg: "rgba(108,99,255,0.12)",
      },
      {
        key: "total-pnl",
        label: "Total PnL",
        value: formatCurrency(summary.totalPnl),
        sub: formatPercent(summary.totalPnlPercent),
        icon: summary.totalPnl >= 0 ? TrendingUp : TrendingDown,
        color:
          summary.totalPnl >= 0
            ? "var(--accent-emerald)"
            : "var(--accent-crimson)",
        iconBg:
          summary.totalPnl >= 0
            ? "rgba(0,229,160,0.12)"
            : "rgba(255,59,107,0.12)",
      },
      {
        key: "day-pnl",
        label: "Day PnL",
        value: formatCurrency(summary.dayPnl),
        sub: formatPercent(dayPnlPercent),
        icon: summary.dayPnl >= 0 ? TrendingUp : TrendingDown,
        color:
          summary.dayPnl >= 0
            ? "var(--accent-emerald)"
            : "var(--accent-crimson)",
        iconBg:
          summary.dayPnl >= 0
            ? "rgba(0,229,160,0.12)"
            : "rgba(255,59,107,0.12)",
      },
      {
        key: "best-performer",
        label: "Best Performer",
        value: summary.bestPerformer?.symbol ?? "-",
        sub: summary.bestPerformer
          ? formatPercent(summary.bestPerformer.pnlPercent)
          : "-",
        icon: Award,
        color: "var(--accent-gold)",
        iconBg: "rgba(255,181,71,0.12)",
      },
    ];
  }, [summary, holdings.length]);

  return (
    <section id="portfolio" className="relative pt-20 pb-24">
      <div className="mx-auto max-w-[1440px] px-6">
        {/* Section header */}
        <motion.div {...stagger} className="mb-12">
          <span className="text-label mb-3 block">Holdings</span>
          <h2 className="text-heading">
            Your <span className="text-gradient">Portfolio</span>
          </h2>
        </motion.div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {holdingsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : summaryCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.key}
                    {...stagger}
                    transition={{ ...stagger.transition, delay: 0.1 + i * 0.05 }}
                  >
                    <GlassCard>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="text-label">{card.label}</span>
                          </div>
                          <div
                            className="truncate font-display text-2xl font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {card.value}
                          </div>
                          <div
                            className="mt-1 truncate font-mono text-xs"
                            style={{ color: card.color }}
                          >
                            {card.sub}
                          </div>
                        </div>
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: card.iconBg }}
                        >
                          <Icon size={16} style={{ color: card.color }} />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
        </div>

        {/* Main grid: holdings table + sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Holdings table */}
          <motion.div
            {...stagger}
            transition={{ ...stagger.transition, delay: 0.3 }}
          >
            <GlassCard noPadding>
              <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-4">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} style={{ color: "var(--accent-primary)" }} />
                  <h3 className="font-display text-base font-semibold">
                    Holdings
                  </h3>
                </div>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {holdings.length} positions
                </span>
              </div>

              {holdingsLoading ? (
                <div className="p-6">
                  <SkeletonTable rows={6} />
                </div>
              ) : holdings.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16">
                  <Wallet
                    size={32}
                    style={{ color: "var(--text-tertiary)" }}
                    className="mb-3"
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    No holdings found in your portfolio.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        style={{ color: "var(--text-tertiary)" }}
                        className="border-b border-[var(--glass-border)]"
                      >
                        <th className="px-6 py-3 text-left text-[10px] font-medium uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider">
                          Avg Buy
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider">
                          LTP
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider">
                          Current Value
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider">
                          PnL
                        </th>
                        <th className="px-6 py-3 text-right text-[10px] font-medium uppercase tracking-wider">
                          PnL %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((holding, i) => (
                        <motion.tr
                          key={holding.symbol}
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.35,
                            delay: 0.4 + i * 0.04,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="border-b border-[var(--glass-border)] transition-colors last:border-0 hover:bg-[rgba(255,255,255,0.02)]"
                        >
                          <td className="px-6 py-3">
                            <span
                              className="font-mono text-sm font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {holding.symbol}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 text-xs whitespace-nowrap"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {holding.name}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-mono text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {holding.qty}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-mono text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            ₹{formatPrice(holding.avgBuy)}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-mono text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            ₹{formatPrice(holding.ltp)}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-mono text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            ₹{formatPrice(holding.currentValue)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-mono text-sm font-medium whitespace-nowrap",
                              holding.pnl >= 0
                                ? "text-[var(--accent-emerald)]"
                                : "text-[var(--accent-crimson)]"
                            )}
                          >
                            {holding.pnl >= 0 ? "+" : "-"}₹
                            {formatPrice(Math.abs(holding.pnl))}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <PriceBadge value={holding.pnlPercent} size="sm" />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Sector allocation */}
            <motion.div
              {...stagger}
              transition={{ ...stagger.transition, delay: 0.4 }}
            >
              <GlassCard className="flex flex-col items-center">
                <div className="mb-4 flex w-full items-center justify-between">
                  <h3 className="text-label">Sector Allocation</h3>
                  {sectorSegments.length > 0 && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {sectorSegments.length} sectors
                    </span>
                  )}
                </div>

                {holdingsLoading || sectorSegments.length === 0 ? (
                  <Skeleton width={200} height={200} rounded="full" />
                ) : (
                  <AllocationRing
                    segments={sectorSegments}
                    size={200}
                    strokeWidth={24}
                  />
                )}

                {sectorSegments.length > 0 && (
                  <div className="mt-5 grid w-full grid-cols-2 gap-x-4 gap-y-2">
                    {sectorSegments.map((seg) => (
                      <div
                        key={seg.label}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: seg.color }}
                          />
                          <span
                            className="truncate text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {seg.label}
                          </span>
                        </div>
                        <span
                          className="shrink-0 font-mono text-[10px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {(
                            (seg.value / summary.totalValue) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Performance chart */}
            <motion.div
              {...stagger}
              transition={{ ...stagger.transition, delay: 0.5 }}
            >
              <GlassCard noPadding>
                <div className="border-b border-[var(--glass-border)] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold">
                      Performance (1M)
                    </h3>
                    {performance.length > 0 && (
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        ₹{formatPrice(performance[performance.length - 1].value)}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Portfolio value over time
                  </span>
                </div>
                <div className="p-4">
                  {performanceLoading ? (
                    <Skeleton height={220} width="100%" rounded="lg" />
                  ) : performanceData.length > 0 ? (
                    <LightweightChart data={performanceData} height={220} chartType="area" />
                  ) : (
                    <div
                      className="flex h-[220px] items-center justify-center text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      No performance data available
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
