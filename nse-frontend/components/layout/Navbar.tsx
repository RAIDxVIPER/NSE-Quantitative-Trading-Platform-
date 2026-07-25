"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Search,
  Menu,
  X,
  BarChart3,
  Briefcase,
  Newspaper,
  Info,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useScrollProgress } from "@/hooks/useScrollProgress";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "About", href: "/about", icon: Info },
];

function ISTClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
      {time} IST
    </span>
  );
}

export function Navbar() {
  const { isScrolled } = useScrollProgress();
  const { openSearch, isMobileMenuOpen, setMobileMenuOpen } = useAppStore();
  const pathname = usePathname();

  /* ⌘K shortcut */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSearch]);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled
            ? "bg-[rgba(5,5,8,0.72)] backdrop-blur-2xl backdrop-saturate-[180%] border-b border-[var(--glass-border)]"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              }}
            >
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              NSE
              <span className="text-gradient"> Analytics</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-medium transition-colors duration-300",
                    isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full"
                      style={{ background: "var(--accent-primary)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-4">
            {/* Live badge */}
            <div className="hidden items-center gap-2 md:flex">
              <div className="live-dot" />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--accent-emerald)" }}
              >
                LIVE
              </span>
              <ISTClock />
            </div>

            {/* Search trigger */}
            <button
              onClick={openSearch}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5",
                "border border-[var(--glass-border)] bg-[var(--glass-fill)]",
                "text-sm transition-all duration-300",
                "hover:border-[var(--glass-shine)] hover:bg-[rgba(255,255,255,0.06)]"
              )}
              style={{ color: "var(--text-secondary)" }}
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search</span>
              <kbd
                className="ml-1 hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block"
                style={{
                  borderColor: "var(--glass-border)",
                  color: "var(--text-tertiary)",
                }}
              >
                ⌘K
              </kbd>
            </button>

            {/* Mobile menu toggle */}
            <button
              className="flex items-center justify-center rounded-lg p-2 md:hidden"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed inset-x-0 top-16 z-40 p-4 md:hidden",
              "border-b border-[var(--glass-border)]",
              "bg-[rgba(5,5,8,0.95)] backdrop-blur-2xl"
            )}
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      pathname === link.href
                        ? "bg-[rgba(108,99,255,0.1)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile live badge + clock */}
            <div className="mt-4 flex items-center gap-2 border-t border-[var(--glass-border)] pt-4">
              <div className="live-dot" />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--accent-emerald)" }}
              >
                LIVE
              </span>
              <ISTClock />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
