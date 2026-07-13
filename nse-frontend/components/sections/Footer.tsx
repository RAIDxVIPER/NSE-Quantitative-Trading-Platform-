"use client";

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import {
  Github,
  Twitter,
  Linkedin,
  ArrowUp,
  Activity,
  BookOpen,
  Code2,
  LifeBuoy,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stagger = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const productLinks = [
  { label: "Hero", href: "#hero" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Analytics", href: "#analytics" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "News", href: "#news" },
  { label: "Search", href: "#search" },
  { label: "About", href: "#about" },
];

const resourceLinks = [
  { label: "Documentation", href: "#", icon: BookOpen },
  { label: "API Reference", href: "#", icon: Code2 },
  { label: "GitHub", href: "#", icon: Github },
  { label: "Support", href: "#", icon: LifeBuoy },
];

const legalLinks = [
  { label: "Privacy Policy", href: "#", icon: ShieldCheck },
  { label: "Terms of Service", href: "#", icon: FileText },
  { label: "Disclaimer", href: "#", icon: AlertTriangle },
];

const socialLinks = [
  { label: "GitHub", href: "#", Icon: Github },
  { label: "Twitter", href: "#", Icon: Twitter },
  { label: "LinkedIn", href: "#", Icon: Linkedin },
];

function FooterColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.12em]"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </h3>
  );
}

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  Icon?: React.ComponentType<{ size?: string | number; className?: string }>;
}

function FooterLink({ href, children, Icon }: FooterLinkProps) {
  return (
    <li>
      <a
        href={href}
        className={cn(
          "group inline-flex items-center gap-2 py-1.5 text-sm transition-colors duration-200",
          "hover:text-[var(--text-primary)]"
        )}
        style={{ color: "var(--text-tertiary)" }}
      >
        {Icon && (
          <Icon
            size={14}
            className="opacity-60 transition-opacity duration-200 group-hover:opacity-100"
          />
        )}
        <span>{children}</span>
      </a>
    </li>
  );
}

export function Footer() {
  const handleBackToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <footer className="relative mt-12">
      {/* Ambient glow top border */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(108,99,255,0.6) 30%, rgba(0,212,255,0.6) 70%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[80%] -translate-x-1/2 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(108,99,255,0.18) 0%, rgba(0,212,255,0.08) 40%, transparent 70%)",
        }}
      />

      <div
        className="relative border-t border-[var(--glass-border)]"
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="mx-auto max-w-[1440px] px-6 py-16">
          {/* 4-column grid */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Column 1 — Brand */}
            <motion.div {...stagger} className="lg:pr-6">
              <a
                href="#hero"
                className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-90"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                    boxShadow: "0 0 24px rgba(108,99,255,0.35)",
                  }}
                >
                  <Activity size={18} color="#fff" strokeWidth={2.5} />
                </div>
                <span
                  className="font-display text-lg font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  NSE <span className="text-gradient">Analytics</span>
                </span>
              </a>

              <p
                className="mt-4 max-w-[260px] text-sm leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                Cinematic, real-time market intelligence for the modern quant.
                Quantify, simulate, and decide — all in one place.
              </p>

              <div className="mt-5 inline-flex items-center gap-2">
                <span className="live-dot" style={{ width: 8, height: 8 }} />
                <span
                  className="font-mono text-[11px] uppercase tracking-[0.1em]"
                  style={{ color: "var(--accent-emerald)" }}
                >
                  Markets Live
                </span>
              </div>
            </motion.div>

            {/* Column 2 — Product */}
            <motion.div
              {...stagger}
              transition={{ ...stagger.transition, delay: 0.1 }}
            >
              <FooterColumnHeading>Product</FooterColumnHeading>
              <ul className="space-y-1">
                {productLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </motion.div>

            {/* Column 3 — Resources */}
            <motion.div
              {...stagger}
              transition={{ ...stagger.transition, delay: 0.2 }}
            >
              <FooterColumnHeading>Resources</FooterColumnHeading>
              <ul className="space-y-1">
                {resourceLinks.map((link) => (
                  <FooterLink
                    key={link.label}
                    href={link.href}
                    Icon={link.icon}
                  >
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </motion.div>

            {/* Column 4 — Legal */}
            <motion.div
              {...stagger}
              transition={{ ...stagger.transition, delay: 0.3 }}
            >
              <FooterColumnHeading>Legal</FooterColumnHeading>
              <ul className="space-y-1">
                {legalLinks.map((link) => (
                  <FooterLink
                    key={link.label}
                    href={link.href}
                    Icon={link.icon}
                  >
                    {link.label}
                  </FooterLink>
                ))}
              </ul>

              {/* Back-to-top button */}
              <button
                type="button"
                onClick={handleBackToTop}
                aria-label="Back to top"
                className={cn(
                  "mt-6 inline-flex items-center gap-2 rounded-lg border px-3.5 py-2",
                  "text-xs font-medium transition-all duration-300",
                  "hover:-translate-y-0.5 hover:border-[rgba(108,99,255,0.45)] hover:text-[var(--text-primary)]"
                )}
                style={{
                  borderColor: "var(--glass-border)",
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--glass-fill)",
                }}
              >
                <ArrowUp size={14} />
                <span className="font-mono uppercase tracking-[0.08em]">
                  Back to top
                </span>
              </button>
            </motion.div>
          </div>

          {/* Bottom bar */}
          <div
            className="mt-14 flex flex-col items-start justify-between gap-5 border-t border-[var(--glass-border)] pt-6 sm:flex-row sm:items-center"
          >
            <p
              className="font-mono text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              &copy; 2026 NSE Analytics. All rights reserved.
            </p>

            <div className="flex items-center gap-2">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={cn(
                    "group inline-flex h-9 w-9 items-center justify-center rounded-lg border",
                    "transition-all duration-300 hover:-translate-y-0.5"
                  )}
                  style={{
                    borderColor: "var(--glass-border)",
                    backgroundColor: "var(--glass-fill)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Icon
                    size={15}
                    className="transition-colors duration-300 group-hover:text-[var(--text-primary)]"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
