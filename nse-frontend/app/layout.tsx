import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { MouseTracker } from "@/components/providers/MouseTracker";

export const metadata: Metadata = {
  title: "NSE Analytics — Quantitative Finance Dashboard",
  description:
    "Premium real-time Indian market analytics: order book, regime detection, options pricing, liquidity shock detection. Cinematic data visualization for the modern quant.",
  keywords: [
    "NSE",
    "NIFTY 50",
    "stock market",
    "analytics",
    "quantitative finance",
    "options pricing",
    "market regime",
    "trading dashboard",
  ],
  authors: [{ name: "NSE Analytics" }],
  openGraph: {
    title: "NSE Analytics — Quantitative Finance Dashboard",
    description:
      "Cinematic real-time analytics for Indian equity markets.",
    type: "website",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050508",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen overflow-x-hidden bg-bg-void text-text-primary">
        <QueryProvider>
          {/* Ambient background glows */}
          <div className="ambient-glow" aria-hidden="true" />
          <div className="spotlight-cursor" aria-hidden="true" />

          {/* Mouse tracker writes --cursor-x/--cursor-y CSS vars */}
          <MouseTracker />

          {/* 3D canvas mount point — Phase 4 will insert <Scene /> here */}
          <div id="three-canvas-root" className="pointer-events-none fixed inset-0 z-0" />

          {/* Main page content */}
          <main className="relative z-10">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
