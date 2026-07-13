"use client";

import React, { useRef, type ReactNode, type CSSProperties } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  noPadding?: boolean;
  noShine?: boolean;
  as?: "div" | "article" | "section";
}

export function GlassCard({
  children,
  className,
  glowColor,
  noPadding = false,
  noShine = false,
  ...motionProps
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-[var(--glass-border)]",
        "bg-[var(--glass-fill)]",
        "backdrop-blur-[20px] backdrop-saturate-[180%]",
        !noPadding && "p-6",
        className
      )}
      whileHover={{
        y: -4,
        borderColor: "rgba(255,255,255,0.12)",
        boxShadow: glowColor
          ? `0 0 40px ${glowColor}`
          : "0 0 40px rgba(108,99,255,0.15)",
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      }}
      style={
        {
          transition:
            "transform 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)",
        } as CSSProperties
      }
      {...motionProps}
    >
      {/* Shine top-edge */}
      {!noShine && (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
          }}
        />
      )}

      {children}
    </motion.div>
  );
}
