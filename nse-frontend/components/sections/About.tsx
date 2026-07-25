"use client";

import React from "react";
import { motion } from "framer-motion";
import { Database, Zap, Brain, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/common/GlassCard";

const stagger = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

interface Feature {
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: string | number; style?: React.CSSProperties }>;
  color: string;
}

const features: Feature[] = [
  {
    title: "Data Driven",
    description:
      "Ingested from NSE, BSE and global feeds. Every signal is grounded in verifiable market data.",
    Icon: Database,
    color: "var(--accent-secondary)",
  },
  {
    title: "Real-Time",
    description:
      "Sub-second streaming pipelines keep watchlists, charts and alerts in lockstep with the tape.",
    Icon: Zap,
    color: "var(--accent-gold)",
  },
  {
    title: "ML Powered",
    description:
      "Forecasts and sentiment scores produced by transformer models trained on years of tick history.",
    Icon: Brain,
    color: "var(--accent-primary)",
  },
  {
    title: "Secure",
    description:
      "End-to-end encryption, signed sessions and isolated execution for every portfolio query.",
    Icon: ShieldCheck,
    color: "var(--accent-emerald)",
  },
];

const techStack = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Three.js",
  "Python",
  "FastAPI",
];

export function About() {
  return (
    <section id="about" className="relative pt-20 pb-24">
      <div className="mx-auto max-w-[1440px] px-6">
        {/* Two-column layout */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: heading + description */}
          <div className="flex flex-col justify-center">
            <motion.div {...stagger}>
              <span className="text-label mb-3 block">About the Platform</span>
              <h2 className="text-heading">
                Built for the{" "}
                <span className="text-gradient">Modern Quant</span>
              </h2>
            </motion.div>
            <motion.p
              {...stagger}
              transition={{ ...stagger.transition, delay: 0.1 }}
              className="mt-6 max-w-xl text-base leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              NSE Analytics fuses institutional-grade market data with
              modern machine learning to give traders, analysts and
              researchers a single workspace for discovery, validation
              and execution. No spreadsheets, no stale feeds — just
              signal.
            </motion.p>
          </div>

          {/* Right: 2x2 feature grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((feature, idx) => {
              const { Icon } = feature;
              return (
                <motion.div
                  key={feature.title}
                  {...stagger}
                  transition={{ ...stagger.transition, delay: 0.1 + idx * 0.08 }}
                >
                  <GlassCard className="h-full">
                    <div
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${feature.color} 30%, transparent)`,
                      }}
                    >
                      <Icon size={20} style={{ color: feature.color }} />
                    </div>
                    <h3
                      className="font-display text-lg font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Tech stack row */}
        <motion.div
          {...stagger}
          transition={{ ...stagger.transition, delay: 0.45 }}
          className="mt-16"
        >
          <div className="mb-6 flex items-center gap-4">
            <span className="text-label">Powered By</span>
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(90deg, var(--glass-border) 0%, transparent 100%)",
              }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {techStack.map((tech, idx) => (
              <motion.span
                key={tech}
                {...stagger}
                transition={{ ...stagger.transition, delay: 0.55 + idx * 0.05 }}
                className="pill pill-accent"
                style={{
                  background: "rgba(108, 99, 255, 0.08)",
                  border: "1px solid var(--glass-border)",
                  padding: "8px 16px",
                  fontSize: "13px",
                }}
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
