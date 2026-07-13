"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, TrendingUp, BarChart2, Layers, X } from "lucide-react";
import { cn, formatPrice, formatPercent, getDeltaSymbol } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useSearch, type SearchResult } from "@/lib/api";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const GROUP_ICONS: Record<string, React.ElementType> = {
  Stock: TrendingUp,
  Index: BarChart2,
  Sector: Layers,
};

export function CommandMenu() {
  const { isSearchOpen, closeSearch, setSelectedStock } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);
  const { data: results = [] } = useSearch(debouncedQuery);

  /* Group results by type */
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  const flatResults = useMemo(() => results, [results]);

  /* Focus input on open */
  useEffect(() => {
    if (isSearchOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  /* Reset selected index on result change */
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults]);

  /* Keyboard navigation */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            const item = flatResults[selectedIndex];
            setSelectedStock({ symbol: item.symbol, name: item.name, sector: item.sector });
            closeSearch();
          }
          break;
        case "Escape":
          e.preventDefault();
          closeSearch();
          break;
      }
    },
    [flatResults, selectedIndex, closeSearch, setSelectedStock]
  );

  /* Scroll selected into view */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={closeSearch}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed left-1/2 top-[20vh] z-[101] w-[90vw] max-w-[560px] -translate-x-1/2",
              "overflow-hidden rounded-2xl",
              "border border-[var(--glass-border)]",
              "bg-[rgba(10,10,18,0.95)] backdrop-blur-2xl backdrop-saturate-[180%]",
              "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
            )}
          >
            {/* Shine top edge */}
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              }}
            />

            {/* Input */}
            <div className="flex items-center gap-3 border-b border-[var(--glass-border)] px-5 py-4">
              <Search size={18} style={{ color: "var(--text-secondary)" }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search stocks, indices, sectors…"
                className={cn(
                  "flex-1 bg-transparent text-base font-medium outline-none",
                  "placeholder:text-[var(--text-tertiary)]"
                )}
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={closeSearch}
                className="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              >
                <X size={16} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
              {query.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Start typing to search across stocks, indices, and sectors
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-4">
                    <kbd
                      className="rounded border px-2 py-0.5 font-mono text-[10px]"
                      style={{ borderColor: "var(--glass-border)", color: "var(--text-tertiary)" }}
                    >
                      ↑↓
                    </kbd>
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>navigate</span>
                    <kbd
                      className="rounded border px-2 py-0.5 font-mono text-[10px]"
                      style={{ borderColor: "var(--glass-border)", color: "var(--text-tertiary)" }}
                    >
                      ↵
                    </kbd>
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>select</span>
                    <kbd
                      className="rounded border px-2 py-0.5 font-mono text-[10px]"
                      style={{ borderColor: "var(--glass-border)", color: "var(--text-tertiary)" }}
                    >
                      esc
                    </kbd>
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>close</span>
                  </div>
                </div>
              ) : flatResults.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                    No results for &ldquo;{query}&rdquo;
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => {
                  const Icon = GROUP_ICONS[type] || TrendingUp;
                  return (
                    <div key={type} className="mb-1">
                      {/* Group header */}
                      <div className="flex items-center gap-2 px-5 py-2">
                        <Icon size={12} style={{ color: "var(--text-tertiary)" }} />
                        <span className="text-label">{type}s</span>
                      </div>

                      {/* Group items */}
                      {items.map((item) => {
                        const globalIdx = flatResults.indexOf(item);
                        const isSelected = globalIdx === selectedIndex;
                        const isPositive = item.changePercent >= 0;

                        return (
                          <button
                            key={item.symbol}
                            data-index={globalIdx}
                            onClick={() => {
                              setSelectedStock({ symbol: item.symbol, name: item.name, sector: item.sector });
                              closeSearch();
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={cn(
                              "flex w-full items-center justify-between px-5 py-2.5 text-left transition-colors duration-150",
                              isSelected
                                ? "bg-[rgba(108,99,255,0.1)]"
                                : "hover:bg-[rgba(255,255,255,0.03)]"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="font-mono text-sm font-semibold"
                                style={{ color: isSelected ? "var(--accent-primary)" : "var(--text-primary)" }}
                              >
                                {item.symbol}
                              </span>
                              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                {item.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                                ₹{formatPrice(item.price)}
                              </span>
                              <span
                                className="font-mono text-xs font-medium"
                                style={{
                                  color: isPositive ? "var(--accent-emerald)" : "var(--accent-crimson)",
                                }}
                              >
                                {getDeltaSymbol(item.changePercent)} {formatPercent(item.changePercent)}
                              </span>
                              {isSelected && (
                                <ArrowRight size={14} style={{ color: "var(--accent-primary)" }} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {flatResults.length > 0 && (
              <div
                className="border-t border-[var(--glass-border)] px-5 py-2.5 text-right"
              >
                <span className="font-mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {flatResults.length} result{flatResults.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
