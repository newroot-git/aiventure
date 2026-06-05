"use client";
import * as React from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning } from "lucide-react";
import { fetchWeather, type Wx, type WxGroup } from "@/lib/weather";

const ICON: Record<WxGroup, typeof Sun> = {
  sun: Sun, cloud: Cloud, rain: CloudRain, snow: CloudSnow, fog: CloudFog, storm: CloudLightning,
};
// colour the icon to match the condition (sun = gold, rain = blue, etc.)
const WX_STYLE: Record<WxGroup, { bg: string; fg: string }> = {
  sun: { bg: "bg-accent-soft", fg: "text-[#C98A1A]" },
  cloud: { bg: "bg-surface-2", fg: "text-muted" },
  rain: { bg: "bg-secondary-soft", fg: "text-secondary" },
  snow: { bg: "bg-secondary-soft", fg: "text-[#5B8FBF]" },
  fog: { bg: "bg-surface-2", fg: "text-muted" },
  storm: { bg: "bg-[#E7E0F0]", fg: "text-[#6E4FA0]" },
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
  const sty = WX_STYLE[w.group] ?? WX_STYLE.cloud;
  const temp = w.tempC !== undefined ? `${w.tempC}°` : `${w.maxC}° / ${w.minC}°`;

  if (variant === "card") {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-surface px-4 py-3 shadow-hard-sm">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md border-2 border-ink ${sty.bg} ${sty.fg}`}>
          <Icon size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold leading-none">{temp}</span>
            <span className="text-sm font-bold text-ink/70">{w.label}</span>
          </div>
          <div className="mt-0.5 truncate text-xs font-bold text-muted">{date ? "On the day" : "Today"} in {place?.split(",")[0]}</div>
        </div>
      </div>
    );
  }
  return (
    <span className={`mt-1 inline-flex items-center gap-1.5 rounded-md border-2 border-line px-2 py-1 text-xs font-bold ${sty.bg} ${sty.fg}`}>
      <Icon size={13} /> {temp} {w.label}
    </span>
  );
}
