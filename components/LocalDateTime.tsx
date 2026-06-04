"use client";

// Formats an ISO timestamp in the viewer's own timezone. Server-side formatting
// runs in UTC on Vercel and disagrees with client-rendered times — always format
// wall-clock times in the browser.
export function LocalDateTime({ iso, fallback = "To be planned" }: { iso?: string | null; fallback?: string }) {
  if (!iso) return <>{fallback}</>;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return <>{fallback}</>;
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
  const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return <>{hasTime ? `${day} · ${time}` : day}</>;
}
