"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  TrendingUp,
  BarChart2,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/common/GlassCard";
import { useAppStore } from "@/lib/store";
import { useSearch, type SearchResult } from "@/lib/api";
import { MOCK_SEARCH_RESULTS } from "@/lib/mock-data";
import {
  cn,
  formatPrice,
  formatPercent,
  getDeltaSymbol,
} from "@/lib/utils";

const PLACEHOLDERS = [
  "Search stocks, indices, sectors…",
  "Try RELIANCE or NIFTY 50",
  "Discover top movers today",
  "Find IT, Banking, Energy…",
];

const GROUP_ORDER: Array<SearchResult["type"]> = ["Stock", "Index", "Sector"];
const GROUP_LABELS: Record<SearchResult["type"], string> = {
  Stock: "Stocks",
  Index: "Indices",
  Sector: "Sectors",
};
const GROUP_ICONS: Record<SearchResult["type"], React.ElementType> = {
  Stock: TrendingUp,
  Index: BarChart2,
  Sector: Layers,
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const stagger = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

export function Search() {
  const { setSelectedStock } = useAppStore();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 200);
  const { data: results = [] } = useSearch(debouncedQuery);

  /* Cycling placeholder (typewriter-style) */
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (focused || query.length > 0) return;
    const current = PLACEHOLDERS[placeholderIndex];
    const typingSpeed = isDeleting ? 35 : 65;
    const pauseAtEnd = 1400;
    const pauseAtStart = 250;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          const next = current.slice(0, typed.length + 1);
          setTyped(next);
          if (next === current) {
            setTimeout(() => setIsDeleting(true), pauseAtEnd);
          }
        } else {
          const next = current.slice(0, Math.max(0, typed.length - 1));
          setTyped(next);
          if (next.length === 0) {
            setIsDeleting(false);
            setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
          }
        }
      },
      typed.length === 0 && !isDeleting ? pauseAtStart : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [typed, isDeleting, placeholderIndex, focused, query]);

  /* Group results by type */
  const grouped = useMemo(() => {
    const groups: Record<SearchResult["type"], SearchResult[]> = {
      Stock: [],
      Index: [],
      Sector: [],
    };
    results.forEach((r) => {
      if (groups[r.type]) groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  /* Trending tickers for the empty state (prefer Stocks) */
  const trending = useMemo(() => {
    const stocks = MOCK_SEARCH_RESULTS.filter((r) => r.type === "Stock").slice(0, 6);
    const others = MOCK_SEARCH_RESULTS
      .filter((r) => r.type !== "Stock")
      .slice(0, 3);
    return [...stocks, ...others];
  }, []);

  const handleSelect = (item: SearchResult) => {
    setSelectedStock({
      symbol: item.symbol,
      name: item.name,
      sector: item.sector,
    });
    setQuery("");
    if (typeof window !== "undefined") {
      window.location.hash = "#analytics";
    }
  };

  const showResults = debouncedQuery.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <section id="search" className="relative pt-20 pb-24">
      <div className="mx-auto max-w-[1440px] px-6">
        {/* Section header */}
        <motion.div
          {...stagger}
          className="mb-12 flex flex-col items-center text-center"
        >
          <span className="text-label mb-3 block">Search</span>
          <h2 className="text-heading">
            Find{" "}
            <span className="text-gradient">Opportunities</span>
          </h2>
          <p
            className="mt-3 max-w-xl text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Search across thousands of stocks, indices, and sectors to power
            your next move.
          </p>
        </motion.div>

        {/* Search input */}
        <motion.div
          {...stagger}
          transition={{ ...stagger.transition, delay: 0.1 }}
          className="mx-auto mb-10 max-w-3xl"
        >
          <GlassCard
            noPadding
            className={cn(
              "transition-shadow duration-300",
              focused && "shadow-[0_0_50px_rgba(108,99,255,0.25)]"
            )}
          >
            <div className="flex items-center gap-4 px-6 py-5">
              <SearchIcon
                size={22}
                style={{
                  color: focused
                    ? "var(--accent-primary)"
                    : "var(--text-tertiary)",
                  transition: "color 0.2s ease",
                }}
              />
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder=""
                  aria-label="Search stocks, indices, and sectors"
                  className={cn(
                    "w-full bg-transparent text-lg font-medium outline-none",
                    "md:text-xl"
                  )}
                  style={{ color: "var(--text-primary)" }}
                />
                {!query && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-lg font-medium md:text-xl"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {typed}
                    <span
                      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[1px]"
                      style={{
                        background: "var(--accent-primary)",
                        animation: "typewriter-cursor 1s ease-in-out infinite",
                      }}
                    />
                  </span>
                )}
              </div>
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Clear
                </button>
              )}
              <kbd
                className="hidden rounded border px-2 py-0.5 font-mono text-[10px] md:inline-block"
                style={{
                  borderColor: "var(--glass-border)",
                  color: "var(--text-tertiary)",
                }}
              >
                /
              </kbd>
            </div>
          </GlassCard>
        </motion.div>

        {/* Results / Empty state */}
        <AnimatePresence mode="wait">
          {showResults ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-4xl"
            >
              <GlassCard noPadding>
                <div className="px-6 pt-5 pb-2">
                  <span className="text-label">
                    {hasResults
                      ? `${results.length} result${results.length !== 1 ? "s" : ""}`
                      : "No matches"}
                  </span>
                </div>

                {hasResults ? (
                  <div className="px-2 pb-2">
                    {GROUP_ORDER.filter((t) => grouped[t].length > 0).map(
                      (type) => {
                        const Icon = GROUP_ICONS[type];
                        const items = grouped[type];
                        return (
                          <div key={type} className="mb-2 last:mb-0">
                            <div className="flex items-center gap-2 px-4 py-2">
                              <Icon
                                size={12}
                                style={{ color: "var(--text-tertiary)" }}
                              />
                              <span className="text-label">
                                {GROUP_LABELS[type]}
                              </span>
                              <span
                                className="font-mono text-[10px]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                ({items.length})
                              </span>
                            </div>
                            <div className="flex flex-col">
                              {items.map((item) => {
                                const isPositive = item.changePercent >= 0;
                                return (
                                  <button
                                    key={`${type}-${item.symbol}`}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className={cn(
                                      "group flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-left transition-colors duration-150",
                                      "hover:bg-[rgba(108,99,255,0.08)]"
                                    )}
                                  >
                                    <div className="flex min-w-0 items-center gap-4">
                                      <span
                                        className="w-14 shrink-0 rounded-md border px-2 py-1 text-center font-mono text-xs font-semibold"
                                        style={{
                                          borderColor: "var(--glass-border)",
                                          color: "var(--text-primary)",
                                          background: "rgba(255,255,255,0.02)",
                                        }}
                                      >
                                        {type === "Index" ? "IDX" : type === "Sector" ? "SEC" : "STK"}
                                      </span>
                                      <div className="flex min-w-0 flex-col">
                                        <span
                                          className="truncate font-mono text-sm font-semibold"
                                          style={{ color: "var(--text-primary)" }}
                                        >
                                          {item.symbol}
                                        </span>
                                        <span
                                          className="truncate text-xs"
                                          style={{ color: "var(--text-tertiary)" }}
                                        >
                                          {item.name}
                                        </span>
                                      </div>
                                      <span
                                        className="hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block"
                                        style={{
                                          background: "rgba(108,99,255,0.10)",
                                          color: "var(--accent-primary)",
                                        }}
                                      >
                                        {item.sector}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <span
                                        className="hidden font-mono text-sm tabular-nums md:inline"
                                        style={{ color: "var(--text-primary)" }}
                                      >
                                        ₹{formatPrice(item.price)}
                                      </span>
                                      <span
                                        className="min-w-[64px] rounded-md px-2 py-1 text-right font-mono text-xs font-semibold tabular-nums"
                                        style={{
                                          color: isPositive
                                            ? "var(--accent-emerald)"
                                            : "var(--accent-crimson)",
                                          background: isPositive
                                            ? "rgba(16,185,129,0.10)"
                                            : "rgba(239,68,68,0.10)",
                                        }}
                                      >
                                        {getDeltaSymbol(item.changePercent)}{" "}
                                        {formatPercent(item.changePercent)}
                                      </span>
                                      <ArrowRight
                                        size={14}
                                        className="opacity-0 transition-opacity group-hover:opacity-100"
                                        style={{ color: "var(--accent-primary)" }}
                                      />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="px-6 pb-8 pt-2 text-center">
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      No results for &ldquo;{debouncedQuery}&rdquo;. Try a
                      different symbol or sector.
                    </p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="popular"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-4xl"
            >
              <GlassCard noPadding>
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={14}
                      style={{ color: "var(--accent-primary)" }}
                    />
                    <span className="text-label">Popular Searches</span>
                  </div>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Trending tickers
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 px-2 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trending.map((item) => {
                    const Icon = GROUP_ICONS[item.type];
                    const isPositive = item.changePercent >= 0;
                    return (
                      <motion.button
                        key={`trend-${item.symbol}`}
                        type="button"
                        onClick={() => handleSelect(item)}
                        whileHover={{ y: -2 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={cn(
                          "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-200",
                          "hover:border-[rgba(108,99,255,0.45)] hover:bg-[rgba(108,99,255,0.06)]"
                        )}
                        style={{ borderColor: "var(--glass-border)" }}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: "rgba(108,99,255,0.10)",
                              color: "var(--accent-primary)",
                            }}
                          >
                            <Icon size={14} />
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span
                              className="truncate font-mono text-sm font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {item.symbol}
                            </span>
                            <span
                              className="truncate text-[11px]"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {item.sector}
                            </span>
                          </div>
                        </div>
                        <span
                          className="shrink-0 rounded-md px-2 py-1 font-mono text-[11px] font-semibold tabular-nums"
                          style={{
                            color: isPositive
                              ? "var(--accent-emerald)"
                              : "var(--accent-crimson)",
                            background: isPositive
                              ? "rgba(16,185,129,0.10)"
                              : "rgba(239,68,68,0.10)",
                          }}
                        >
                          {getDeltaSymbol(item.changePercent)}{" "}
                          {formatPercent(item.changePercent)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
