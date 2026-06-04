"use client";
import * as React from "react";
import { MapPin, Loader2 } from "lucide-react";

// Multi-pin map using Leaflet + OpenStreetMap tiles (no API key).
// Geocodes each chosen activity via Nominatim and drops a numbered pin.

type Pin = { label: string; place: string; hint?: string };
type Located = Pin & { lat: number; lng: number; approx?: boolean };

let leafletPromise: Promise<unknown> | null = null;
function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as unknown as { L?: unknown };
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve((window as unknown as { L: unknown }).L);
    s.onerror = reject;
    document.body.appendChild(s);
  });
  return leafletPromise;
}

async function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "Accept-Language": "en" } },
    );
    const j = await res.json();
    if (Array.isArray(j) && j[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch {}
  return null;
}

function near(a: { lat: number; lng: number }, b: { lat: number; lng: number }, deg = 1.2) {
  return Math.abs(a.lat - b.lat) < deg && Math.abs(a.lng - b.lng) < deg;
}

// Nominatim is weak on business names + can match the wrong country. Always anchor to
// the area: try venue/neighbourhood WITH the area, accept only hits near the area centre.
async function geocodePin(
  pin: Pin, area: string | null, center: { lat: number; lng: number } | null,
): Promise<{ lat: number; lng: number; approx: boolean } | null> {
  const tries = [
    area ? `${pin.place}, ${area}` : pin.place,
    pin.hint && area ? `${pin.hint}, ${area}` : pin.hint,
  ].filter(Boolean) as string[];
  for (const q of tries) {
    const hit = await nominatim(q);
    if (hit && (!center || near(hit, center))) return { ...hit, approx: false };
  }
  if (center) return { ...center, approx: true };
  return null;
}

export function PlanMap({ pins, area }: { pins: Pin[]; area?: string | null }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<unknown>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "empty">("loading");

  // stable key so we only re-geocode when the set of places changes
  const key = pins.map((p) => p.place).join("|");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setState("loading");
      const L = (await loadLeaflet()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (cancelled || !L || !ref.current) return;

      // anchor everything to the area centre so pins can't fly to the wrong country
      const center = area ? await nominatim(area) : null;
      if (cancelled) return;

      const located: Located[] = [];
      let approxN = 0;
      for (const p of pins) {
        const c = await geocodePin(p, area ?? null, center);
        if (cancelled) return;
        if (c) {
          // spread area-level fallbacks in a small ring so they don't stack on one point
          if (c.approx) {
            const ang = (approxN++ * 2 * Math.PI) / Math.max(1, pins.length);
            located.push({ ...p, lat: c.lat + 0.004 * Math.cos(ang), lng: c.lng + 0.006 * Math.sin(ang), approx: true });
          } else {
            located.push({ ...p, lat: c.lat, lng: c.lng });
          }
        }
      }
      if (cancelled) return;
      if (!located.length) { setState("empty"); return; }

      // tear down any prior instance (re-render / hot reload)
      if (mapRef.current) { (mapRef.current as { remove: () => void }).remove(); mapRef.current = null; }
      ref.current.innerHTML = "";

      const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

      const latlngs: [number, number][] = [];
      located.forEach((p, i) => {
        const bg = p.approx ? "#c98a1a" : "#3b7a57";
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:grid;place-items:center;width:26px;height:26px;border-radius:50%;border:2px solid #1a1a1a;background:${bg};color:#fff;font-weight:800;font-size:12px;box-shadow:1px 1px 0 #1a1a1a">${i + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker([p.lat, p.lng], { icon }).addTo(map)
          .bindPopup(`<b>${i + 1}. ${p.label}</b><br/>${p.place}${p.approx ? "<br/><i>approx. area</i>" : ""}`);
        latlngs.push([p.lat, p.lng]);
      });
      if (latlngs.length === 1) map.setView(latlngs[0], 14);
      else map.fitBounds(latlngs, { padding: [30, 30] });
      setState("ready");
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { (mapRef.current as { remove: () => void }).remove(); mapRef.current = null; }
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-ink/10">
      <div ref={ref} className="h-52 w-full bg-surface-2" />
      {state !== "ready" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-surface-2/80 text-sm font-bold text-muted">
          {state === "loading" ? (
            <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Mapping your stops…</span>
          ) : (
            <span className="inline-flex items-center gap-2"><MapPin size={16} /> Pin a few stops to see them mapped</span>
          )}
        </div>
      )}
    </div>
  );
}
