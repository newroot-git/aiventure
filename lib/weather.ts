// Weather via Open-Meteo (free, no API key, CORS-friendly so it runs client-side).
// Geocodes a place name, then fetches either current conditions or a day's forecast.

export type WxGroup = "sun" | "cloud" | "rain" | "snow" | "fog" | "storm";
export interface Wx {
  group: WxGroup;
  label: string;
  tempC?: number; // current
  maxC?: number; // forecast day
  minC?: number;
}

function group(code: number): WxGroup {
  if (code === 0 || code === 1) return "sun";
  if (code === 2 || code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}
function label(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Storms";
  return "Cloudy";
}

const geoCache = new Map<string, { lat: number; lon: number } | null>();
async function geocode(place: string): Promise<{ lat: number; lon: number } | null> {
  // open-meteo geocoding likes a plain place name, not a full address
  const name = place.split(",")[0].trim();
  if (!name) return null;
  if (geoCache.has(name)) return geoCache.get(name)!;
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
    const j = await r.json();
    const hit = j?.results?.[0];
    const out = hit ? { lat: hit.latitude as number, lon: hit.longitude as number } : null;
    geoCache.set(name, out);
    return out;
  } catch { return null; }
}

/** Current conditions for a place, or the forecast for a specific date (YYYY-MM-DD). */
export async function fetchWeather(place: string, dateISO?: string): Promise<Wx | null> {
  const geo = await geocode(place);
  if (!geo) return null;
  try {
    if (dateISO) {
      const day = dateISO.slice(0, 10);
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&start_date=${day}&end_date=${day}&timezone=auto`);
      const j = await r.json();
      const code = j?.daily?.weather_code?.[0];
      if (code === undefined || code === null) return null; // out of forecast range
      return {
        group: group(code), label: label(code),
        maxC: Math.round(j.daily.temperature_2m_max[0]),
        minC: Math.round(j.daily.temperature_2m_min[0]),
      };
    }
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,weather_code&timezone=auto`);
    const j = await r.json();
    const code = j?.current?.weather_code;
    if (code === undefined || code === null) return null;
    return { group: group(code), label: label(code), tempC: Math.round(j.current.temperature_2m) };
  } catch { return null; }
}
