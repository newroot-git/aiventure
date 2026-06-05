"use client";
import * as React from "react";
import { Plus, Loader2, MapPin, Sparkles } from "lucide-react";
import { Button } from "./ui";

// Cache query → results so retyping / backspacing / revisiting the same search
// reuses the last response instead of re-hitting Nominatim.
type PlaceRow = { name: string; label: string };
const searchCache = new Map<string, PlaceRow[]>();

// Maps-style place picker (OSM Nominatim). Type → pick a real place, use what you
// typed as a custom spot, or (if onAiFind given) ask AI to resolve a specific venue
// that OSM can't surface (e.g. a named coffee shop).
export function PlaceSearch({
  area, onPick, onAiFind, placeholder = "Add a place — search, or type your own…",
}: {
  area?: string | null;
  onPick: (title: string, area?: string) => void;
  onAiFind?: (query: string) => Promise<void> | void;
  placeholder?: string;
}) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<PlaceRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [aiBusy, setAiBusy] = React.useState(false);

  React.useEffect(() => {
    const s = q.trim();
    if (s.length < 3) { setResults([]); setBusy(false); return; }
    const query = area ? `${s}, ${area}` : s;
    const cached = searchCache.get(query);
    if (cached) { setResults(cached); setBusy(false); return; }
    setBusy(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const j = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": "en" }, signal: ctrl.signal }).then((r) => r.json());
        const rows: PlaceRow[] = Array.isArray(j) ? j.map((r: { display_name: string }) => ({
          name: r.display_name.split(",")[0].trim(),
          label: r.display_name.split(",").slice(0, 3).map((x) => x.trim()).join(", "),
        })) : [];
        searchCache.set(query, rows);
        setResults(rows);
        setBusy(false);
      } catch (e) {
        // ignore aborts (a newer keystroke superseded this request)
        if ((e as Error)?.name !== "AbortError") { setResults([]); setBusy(false); }
      }
    }, 400);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q, area]);

  function pick(title: string) {
    if (!title.trim()) return;
    onPick(title.trim(), area || undefined);
    setQ(""); setResults([]);
  }
  async function aiFind() {
    const s = q.trim();
    if (!s || !onAiFind) return;
    setAiBusy(true);
    try { await onAiFind(s); setQ(""); setResults([]); }
    finally { setAiBusy(false); }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative w-full">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), pick(results[0]?.name ?? q))}
            placeholder={placeholder}
            className="w-full rounded-md border-2 border-line bg-surface px-3 py-2.5 pr-9 text-[15px] outline-none focus:border-primary"
          />
          {busy && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
        </div>
        <Button variant="soft" disabled={!q.trim()} onClick={() => pick(q)}><Plus size={16} /></Button>
      </div>
      {q.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border-2 border-ink bg-surface shadow-hard">
          {results.map((r) => (
            <button key={r.label} onClick={() => pick(r.name)} className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-sm font-bold last:border-0 hover:bg-surface-2">
              <MapPin size={14} className="shrink-0 text-primary" /> <span className="truncate">{r.label}</span>
            </button>
          ))}
          {onAiFind && (
            <button onClick={aiFind} disabled={aiBusy} className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-bold text-secondary hover:bg-surface-2 disabled:opacity-60">
              {aiBusy ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <Sparkles size={14} className="shrink-0" />} Ask AI to find &ldquo;{q.trim()}&rdquo;
            </button>
          )}
          <button onClick={() => pick(q)} className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-bold text-primary hover:bg-surface-2">
            <Plus size={14} className="shrink-0" /> Use &ldquo;{q.trim()}&rdquo; as a custom spot
          </button>
        </div>
      )}
    </div>
  );
}
