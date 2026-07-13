"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CandlestickChart3DProps {
  count?: number;
}

export function CandlestickChart3D({ count = 50 }: CandlestickChart3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  const candles = useMemo(() => {
    const data = [];
    let price = 22000;

    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.48) * price * 0.015;
      const open = price;
      price += change;
      const close = price;
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const bullish = close >= open;

      // Normalize heights for visual representation
      const bodyHeight = Math.abs(close - open) / 50;
      const wickHeight = (high - low) / 50;
      const bodyCenter = ((open + close) / 2 - 22000) / 100;

      data.push({
        x: (i - count / 2) * 0.8,
        bodyHeight: Math.max(bodyHeight, 0.05),
        wickHeight,
        bodyCenter,
        bullish,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, [count]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      if (candles[i]) {
        // Subtle breathing animation
        const breathe = Math.sin(t * 0.8 + candles[i].phaseOffset) * 0.03;
        child.scale.y = 1 + breathe;
        child.position.y = candles[i].bodyCenter + breathe * 0.5;
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -2, -15]} rotation={[0.1, 0.3, 0]}>
      {candles.map((candle, i) => (
        <group key={i} position={[candle.x, candle.bodyCenter, 0]}>
          {/* Candle body */}
          <mesh>
            <boxGeometry args={[0.4, candle.bodyHeight, 0.4]} />
            <meshStandardMaterial
              color={candle.bullish ? "#00E5A0" : "#FF3B6B"}
              transparent
              opacity={0.7}
              emissive={candle.bullish ? "#00E5A0" : "#FF3B6B"}
              emissiveIntensity={0.15}
            />
          </mesh>

          {/* Wick */}
          <mesh>
            <boxGeometry args={[0.06, candle.wickHeight, 0.06]} />
            <meshStandardMaterial
              color={candle.bullish ? "#00E5A0" : "#FF3B6B"}
              transparent
              opacity={0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
