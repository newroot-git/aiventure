"use client";
import * as React from "react";
import { MapPin, Loader2, Plus, Minus, LocateFixed } from "lucide-react";

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

// Module-level cache: the same area/place is geocoded across many plan views and
// re-renders. Caching by query string avoids hammering Nominatim (which rate-limits).
const geoCache = new Map<string, { lat: number; lng: number } | null>();
async function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  if (geoCache.has(q)) return geoCache.get(q) ?? null;
  let result: { lat: number; lng: number } | null = null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "Accept-Language": "en" } },
    );
    const j = await res.json();
    if (Array.isArray(j) && j[0]) result = { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch {}
  geoCache.set(q, result);
  return result;
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
  const boxRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<unknown>(null);
  const recenterRef = React.useRef<(() => void) | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "empty">("loading");
  // Defer the ~100kB Leaflet JS/CSS + geocoding until the map scrolls into view.
  // Most plan visits never reach the map, so loading it eagerly was wasted weight.
  const [armed, setArmed] = React.useState(false);

  // stable key so we only re-geocode when the set of places changes
  const key = pins.map((p) => p.place).join("|");

  React.useEffect(() => {
    if (armed || !boxRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setArmed(true); obs.disconnect(); }
    }, { rootMargin: "200px" });
    obs.observe(boxRef.current);
    return () => obs.disconnect();
  }, [armed]);

  React.useEffect(() => {
    if (!armed) return;
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

      // default zoom control off — we render our own app-styled controls below
      const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false, zoomControl: false });
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
      // fit to all stops — reused by the recenter button when you pan away
      const fit = () => {
        if (latlngs.length === 1) map.setView(latlngs[0], 14);
        else map.fitBounds(latlngs, { padding: [30, 30] });
      };
      fit();
      recenterRef.current = fit;
      setState("ready");
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { (mapRef.current as { remove: () => void }).remove(); mapRef.current = null; }
    };
  }, [key, armed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={boxRef} className="relative isolate z-0 overflow-hidden rounded-xl border-2 border-ink shadow-hard">
      <div ref={ref} className="h-52 w-full bg-surface-2" />
      {/* app-styled map controls (above Leaflet panes via z-[1000], contained by isolate) */}
      {state === "ready" && (
        <div className="absolute right-2 top-2 z-[1000] flex flex-col gap-1.5">
          <MapBtn label="Zoom in" onClick={() => (mapRef.current as { zoomIn: () => void } | null)?.zoomIn()}><Plus size={16} /></MapBtn>
          <MapBtn label="Zoom out" onClick={() => (mapRef.current as { zoomOut: () => void } | null)?.zoomOut()}><Minus size={16} /></MapBtn>
          <MapBtn label="Recenter on stops" onClick={() => recenterRef.current?.()}><LocateFixed size={16} /></MapBtn>
        </div>
      )}
      {state !== "ready" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-surface-2/80 text-sm font-bold text-muted">
          {armed && state === "loading" ? (
            <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Mapping your stops…</span>
          ) : (
            <span className="inline-flex items-center gap-2"><MapPin size={16} /> Pin a few stops to see them mapped</span>
          )}
        </div>
      )}
    </div>
  );
}

// app-styled map control button (hard pixel shadow + press-sink)
function MapBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border-2 border-ink bg-surface text-ink shadow-hard-sm transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
    >
      {children}
    </button>
  );
}
