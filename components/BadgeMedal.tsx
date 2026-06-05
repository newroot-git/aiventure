"use client";
import { useState } from "react";
import { Lock, Award } from "lucide-react";

// Pixel-medallion badge. Prefers the generated pixel-art badge image at
// /img/badges/<id>.png (earned = full colour; locked = greyscaled + dimmed + lock overlay).
// Falls back to a generic medallion if the image is missing. Takes only serializable
// props so it's safe to render from a server component.
export function BadgeMedal({ id, label, how, got, size = "md" }: {
  id: string; label: string; how: string; got: boolean; size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-12 w-12" : "h-16 w-16";
  const [imgOk, setImgOk] = useState(true);
  const title = got ? label : `Locked — ${how}`;

  if (imgOk) {
    // The badge art IS the medallion (ring + ribbon baked into the image).
    return (
      <div className={`${dim} relative grid place-items-center`} title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/img/badges/${id}.png`}
          alt={title}
          onError={() => setImgOk(false)}
          className={`h-full w-full object-contain ${got ? "" : "opacity-50 grayscale"}`}
          style={{ imageRendering: "pixelated" }}
          draggable={false}
        />
        {!got && (
          <span className="absolute inset-0 grid place-items-center text-ink/70">
            <Lock size={size === "sm" ? 16 : 20} />
          </span>
        )}
      </div>
    );
  }

  // Fallback medallion (nothing breaks if art is absent).
  return (
    <div
      className={`${dim} grid place-items-center rounded-xl border-2 border-ink ${
        got ? "bg-accent text-ink shadow-hard-sm" : "border-dashed bg-surface-2 text-muted"
      }`}
      title={title}
    >
      {got ? <Award size={size === "sm" ? 20 : 26} /> : <Lock size={size === "sm" ? 16 : 20} />}
    </div>
  );
}
