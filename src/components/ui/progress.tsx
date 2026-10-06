"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/** Animated progress bar — grows from 0 on mount and transitions on change. */
export function Progress({
  value,
  className,
  barClassName,
  instant = false,
}: {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  instant?: boolean;
}) {
  const [width, setWidth] = useState(instant ? value : 0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-accent transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          barClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, width))}%` }}
      />
    </div>
  );
}

/** Circular progress ring for stat cards. */
export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, animated)) / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("-rotate-90", className)}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-accent transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}
