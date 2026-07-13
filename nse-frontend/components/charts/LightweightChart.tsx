"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { createChart, type IChartApi, type ISeriesApi, ColorType } from "lightweight-charts";
import { useAppStore } from "@/lib/store";
import type { OHLCVBar } from "@/lib/mock-data";

interface LightweightChartProps {
  data: OHLCVBar[];
  height?: number;
  className?: string;
  chartType?: "candles" | "line" | "area" | "bars";
}

const CHART_COLORS = {
  background: "transparent",
  textColor: "rgba(120,120,160,0.8)",
  gridColor: "rgba(255,255,255,0.03)",
  crosshairColor: "rgba(108,99,255,0.4)",
  borderColor: "rgba(255,255,255,0.06)",
  upColor: "#00E5A0",
  downColor: "#FF3B6B",
  wickUpColor: "rgba(0,229,160,0.6)",
  wickDownColor: "rgba(255,59,107,0.6)",
  lineColor: "#6C63FF",
  areaTopColor: "rgba(108,99,255,0.28)",
  areaBottomColor: "rgba(108,99,255,0.02)",
};

export function LightweightChart({ data, height = 400, className, chartType }: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | null>(null);
  const storeChartType = useAppStore((s) => s.selectedChartType);
  const selectedChartType = chartType ?? storeChartType;

  const createChartInstance = useCallback(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.textColor,
        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.gridColor },
        horzLines: { color: CHART_COLORS.gridColor },
      },
      crosshair: {
        vertLine: {
          color: CHART_COLORS.crosshairColor,
          width: 1,
          style: 2,
          labelBackgroundColor: "#6C63FF",
        },
        horzLine: {
          color: CHART_COLORS.crosshairColor,
          width: 1,
          style: 2,
          labelBackgroundColor: "#6C63FF",
        },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: CHART_COLORS.borderColor,
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Add series based on chart type
    if (selectedChartType === "candles" || selectedChartType === "bars") {
      const series = chart.addCandlestickSeries({
        upColor: CHART_COLORS.upColor,
        downColor: CHART_COLORS.downColor,
        borderDownColor: CHART_COLORS.downColor,
        borderUpColor: CHART_COLORS.upColor,
        wickDownColor: CHART_COLORS.wickDownColor,
        wickUpColor: CHART_COLORS.wickUpColor,
      });
      series.setData(data.map((d) => ({
        time: d.time as string,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })));
      seriesRef.current = series;
    } else if (selectedChartType === "line") {
      const series = chart.addLineSeries({
        color: CHART_COLORS.lineColor,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: CHART_COLORS.lineColor,
      });
      series.setData(data.map((d) => ({
        time: d.time as string,
        value: d.close,
      })));
      seriesRef.current = series;
    } else if (selectedChartType === "area") {
      const series = chart.addAreaSeries({
        lineColor: CHART_COLORS.lineColor,
        topColor: CHART_COLORS.areaTopColor,
        bottomColor: CHART_COLORS.areaBottomColor,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: CHART_COLORS.lineColor,
      });
      series.setData(data.map((d) => ({
        time: d.time as string,
        value: d.close,
      })));
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [data, height, selectedChartType]);

  // Create / recreate chart on type or data change
  useEffect(() => {
    createChartInstance();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [createChartInstance]);

  // Resize observer
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartRef.current) {
          chartRef.current.applyOptions({
            width: entry.contentRect.width,
          });
        }
      }
    });

    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={chartContainerRef}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
