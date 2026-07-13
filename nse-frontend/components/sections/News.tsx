"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  Globe,
  TrendingUp,
  TrendingDown,
  Clock,
  Newspaper,
  Gauge,
} from "lucide-react";
import { useNewsFeed, useSentiment } from "@/lib/api";
import type { NewsItem } from "@/lib/mock-data";
import { GlassCard } from "@/components/common/GlassCard";
import { Skeleton, SkeletonCard } from "@/components/common/SkeletonLoader";
import { cn } from "@/lib/utils";

const stagger = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const CATEGORY_ICONS: Record<NewsItem["category"], React.ElementType> = {
  Earnings: Briefcase,
  Economy: TrendingUp,
  Sector: Building2,
  Global: Globe,
};

const SENTIMENT_STYLES: Record<
  NewsItem["sentiment"],
  { pill: string; dot: string; color: string }
> = {
  Positive: {
    pill: "pill-positive",
    dot: "var(--accent-emerald)",
    color: "var(--accent-emerald)",
  },
  Negative: {
    pill: "pill-negative",
    dot: "var(--accent-crimson)",
    color: "var(--accent-crimson)",
  },
  Neutral: {
    pill: "pill-neutral",
    dot: "var(--text-secondary)",
    color: "var(--text-secondary)",
  },
};

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 4) return `${diffWk}w ago`;
  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo}mo ago`;
}

interface NewsCardProps {
  item: NewsItem;
  featured?: boolean;
  index?: number;
}

function NewsCard({ item, featured = false, index = 0 }: NewsCardProps) {
  const CategoryIcon = CATEGORY_ICONS[item.category];
  const sentiment = SENTIMENT_STYLES[item.sentiment];

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.1 + index * 0.05,
      }}
      className="group h-full"
    >
      <GlassCard className="flex h-full flex-col" noPadding>
        <div className={cn("flex h-full flex-col p-6", featured && "md:p-8")}>
          {/* Top row: category + sentiment */}
          <div className="mb-4 flex items-center justify-between">
            <span className="pill pill-accent">
              <CategoryIcon size={12} />
              {item.category}
            </span>
            <span className={cn("pill", sentiment.pill)}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: sentiment.dot }}
              />
              {item.sentiment}
            </span>
          </div>

          {/* Headline */}
          <h3
            className={cn(
              "font-display font-semibold leading-tight tracking-tight",
              featured ? "text-2xl md:text-3xl" : "text-lg"
            )}
            style={{ color: "var(--text-primary)" }}
          >
            {item.headline}
          </h3>

          {/* Excerpt */}
          <p
            className={cn(
              "mt-3 leading-relaxed",
              featured ? "text-base" : "text-sm"
            )}
            style={{ color: "var(--text-secondary)" }}
          >
            {item.excerpt}
          </p>

          {/* Footer: source + time */}
          <div
            className="mt-auto flex items-center gap-3 pt-5"
            style={{ borderTop: "1px solid var(--glass-border)" }}
          >
            <span
              className="font-mono text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {item.source}
            </span>
            <span
              className="h-1 w-1 rounded-full"
              style={{ background: "var(--text-tertiary)" }}
            />
            <span
              className="flex items-center gap-1 font-mono text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Clock size={11} />
              {getRelativeTime(item.timestamp)}
            </span>
          </div>
        </div>
      </GlassCard>
    </motion.article>
  );
}

function SentimentGauge() {
  const { data: sentiment, isLoading } = useSentiment();

  const score = sentiment?.score ?? 0;
  const label = sentiment?.label ?? "Neutral";
  const change = sentiment?.change ?? 0;
  const isUp = change >= 0;

  // Pick a color based on score (0 = crimson, 50 = gold, 100 = emerald)
  const gaugeColor =
    score >= 60
      ? "var(--accent-emerald)"
      : score >= 40
        ? "var(--accent-gold)"
        : "var(--accent-crimson)";

  return (
    <motion.div {...stagger} transition={{ ...stagger.transition, delay: 0.2 }}>
      <GlassCard className="flex h-full flex-col">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge size={14} style={{ color: gaugeColor }} />
            <span className="text-label">Market Sentiment</span>
          </div>
          {!isLoading && sentiment && (
            <span
              className={cn(
                "pill",
                isUp ? "pill-positive" : "pill-negative"
              )}
            >
              {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isUp ? "+" : ""}
              {change}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-1 flex-col justify-center gap-3">
            <Skeleton width={80} height={36} />
            <Skeleton width="100%" height={12} rounded="full" />
            <Skeleton width={120} height={12} />
          </div>
        ) : (
          <>
            {/* Score */}
            <div className="mb-4 flex items-baseline gap-2">
              <span
                className="font-display text-4xl font-semibold"
                style={{ color: gaugeColor }}
              >
                {score}
              </span>
              <span
                className="font-mono text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                /100
              </span>
            </div>

            {/* Bar */}
            <div
              className="relative h-2 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${score}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.4,
                }}
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, var(--accent-crimson), var(--accent-gold) 50%, var(--accent-emerald))`,
                }}
              />
            </div>

            {/* Scale markers */}
            <div
              className="mt-2 flex justify-between font-mono text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span>Fear</span>
              <span>Neutral</span>
              <span>Greed</span>
            </div>

            {/* Label */}
            <div
              className="mt-5 pt-4"
              style={{ borderTop: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Current Regime
                </span>
                <span
                  className="font-display text-sm font-semibold"
                  style={{ color: gaugeColor }}
                >
                  {label}
                </span>
              </div>
            </div>
          </>
        )}
      </GlassCard>
    </motion.div>
  );
}

export function News() {
  const { data: news = [], isLoading } = useNewsFeed();

  // Pick featured item or fall back to first
  const featuredItem = news.find((n) => n.featured) ?? news[0];
  const remainingItems = news.filter((n) => n.id !== featuredItem?.id);

  return (
    <section id="news" className="relative py-24">
      <div className="mx-auto max-w-[1440px] px-6">
        {/* Section header */}
        <motion.div {...stagger} className="mb-12">
          <span className="text-label mb-3 block">Intelligence</span>
          <h2 className="text-heading">
            Market <span className="text-gradient">News</span>
          </h2>
        </motion.div>

        {/* Top row: Featured + Sentiment */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Featured news */}
          {isLoading ? (
            <SkeletonCard className="h-[260px]" />
          ) : featuredItem ? (
            <NewsCard item={featuredItem} featured index={0} />
          ) : (
            <GlassCard className="flex h-[260px] items-center justify-center">
              <div
                className="flex flex-col items-center gap-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                <Newspaper size={28} />
                <span className="text-sm">No news available</span>
              </div>
            </GlassCard>
          )}

          {/* Sentiment gauge */}
          <SentimentGauge />
        </div>

        {/* Remaining news grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="h-[280px]" />
            ))}
          </div>
        ) : remainingItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {remainingItems.map((item, idx) => (
              <NewsCard key={item.id} item={item} index={idx} />
            ))}
          </div>
        ) : (
          <GlassCard className="flex items-center justify-center py-12">
            <div
              className="flex flex-col items-center gap-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Newspaper size={24} />
              <span className="text-sm">No additional stories</span>
            </div>
          </GlassCard>
        )}
      </div>
    </section>
  );
}
