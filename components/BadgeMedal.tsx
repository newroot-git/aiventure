import { Lock } from "lucide-react";
import type { BadgeDef } from "@/lib/badges";

// Pixel-medallion badge. Earned = gold medal w/ hard shadow + notched ribbon feel;
// locked = greyed with a lock. (Placeholder for real pixel badge art later.)
export function BadgeMedal({ badge, got, size = "md" }: { badge: BadgeDef; got: boolean; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-12 w-12" : "h-16 w-16";
  const Icon = badge.icon;
  return (
    <div
      className={`${dim} grid place-items-center rounded-xl border-2 border-ink ${
        got
          ? "bg-accent text-ink shadow-hard-sm"
          : "border-dashed bg-surface-2 text-muted"
      }`}
      title={got ? badge.label : `Locked — ${badge.how}`}
    >
      {got ? <Icon size={size === "sm" ? 20 : 26} /> : <Lock size={size === "sm" ? 16 : 20} />}
    </div>
  );
}
