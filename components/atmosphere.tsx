import * as React from "react";

// Deterministic star field (no Math.random — sandbox-safe). Twinkling dots.
const STARS = [
  [8, 22, 2], [18, 12, 1], [28, 38, 1], [42, 18, 2], [55, 30, 1],
  [68, 14, 1], [78, 34, 2], [88, 20, 1], [14, 52, 1], [34, 64, 2],
  [50, 56, 1], [63, 70, 1], [82, 60, 2], [92, 48, 1], [24, 80, 1],
  [46, 86, 1], [70, 88, 2], [86, 78, 1], [6, 70, 1], [38, 8, 1],
] as const;

export function Stars({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {STARS.map(([left, top, size], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: size,
            height: size,
            animation: `twinkle ${2.5 + (i % 4) * 0.7}s ease-in-out ${(i % 6) * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Signature sunset->cosmos gradient surface with grain + slow drift.
export function AuroraField({
  className = "",
  stars,
  children,
}: {
  className?: string;
  stars?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`aurora grain drift relative overflow-hidden ${className}`}>
      {stars && <Stars />}
      {children}
    </div>
  );
}
