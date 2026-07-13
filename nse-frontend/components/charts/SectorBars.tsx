"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn, getDeltaColor } from "@/lib/utils";
import type { SectorPerformance } from "@/lib/mock-data";

interface SectorBarsProps {
  sectors: SectorPerformance[];
  className?: string;
}

export function SectorBars({ sectors, className }: SectorBarsProps) {
  const maxAbsChange = Math.max(...sectors.map((s) => Math.abs(s.change)));

  return (
    <div className={cn("space-y-2.5", className)}>
      {sectors.map((sector, i) => {
        const widthPercent = maxAbsChange > 0 ? (Math.abs(sector.change) / maxAbsChange) * 100 : 0;
        const isPositive = sector.change >= 0;
        const color = getDeltaColor(sector.change);

        return (
          <div key={sector.sector} className="group flex items-center gap-3">
            {/* Sector label */}
            <span
              className="w-20 shrink-0 text-right font-mono text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {sector.sector}
            </span>

            {/* Bar container */}
            <div className="relative flex-1 h-6 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.max(widthPercent, 3)}%` }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute top-0 bottom-0 left-0 rounded-md"
                style={{
                  background: `linear-gradient(90deg, ${color}40, ${color}90)`,
                  boxShadow: `0 0 12px ${color}30`,
                }}
              />

              {/* Value label */}
              <div className="relative z-10 flex h-full items-center px-3">
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color }}
                >
                  {isPositive ? "+" : ""}
                  {sector.change.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
