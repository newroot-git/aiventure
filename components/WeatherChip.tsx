"use client";
import * as React from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning } from "lucide-react";
import { fetchWeather, type Wx, type WxGroup } from "@/lib/weather";

const ICON: Record<WxGroup, typeof Sun> = {
  sun: Sun, cloud: Cloud, rain: CloudRain, snow: CloudSnow, fog: CloudFog, storm: CloudLightning,
};

// Compact weather chip. No date → current conditions; with date → that day's forecast.
// Renders nothing until it has data (silent if the place can't be resolved).
export function WeatherChip({ place, date, variant = "chip" }: {
  place?: string | null; date?: string | null; variant?: "chip" | "card";
}) {
  const [w, setW] = React.useState<Wx | null>(null);
  React.useEffect(() => {
    let alive = true;
    if (!place) { setW(null); return; }
    (async () => {
      const r = await fetchWeather(place, date || undefined);
      if (alive) setW(r);
    })();
    return () => { alive = false; };
  }, [place, date]);

  if (!w) return null;
  const Icon = ICON[w.group] ?? Cloud;
  const temp = w.tempC !== undefined ? `${w.tempC}°` : `${w.maxC}° / ${w.minC}°`;

  if (variant === "card") {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-secondary-soft px-4 py-3 shadow-hard-sm">
        <Icon size={26} className="shrink-0 text-secondary" />
        <div className="min-w-0">
          <div className="font-display text-lg font-bold leading-none">{temp} <span className="text-sm font-bold text-muted">{w.label}</span></div>
          <div className="mt-0.5 truncate text-xs font-bold text-muted">{date ? "on the day" : "today"} · {place?.split(",")[0]}</div>
        </div>
      </div>
    );
  }
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 rounded-md border-2 border-line bg-secondary-soft px-2 py-1 text-xs font-bold text-secondary">
      <Icon size={13} /> {temp} {w.label}
    </span>
  );
}
