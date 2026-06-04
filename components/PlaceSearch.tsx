"use client";
import * as React from "react";
import { Plus, Loader2, MapPin } from "lucide-react";
import { Button } from "./ui";

// Maps-style place picker (OSM Nominatim). Type → pick a real place, or use what
// you typed as a custom spot (e.g. "John's house") with no map location.
export function PlaceSearch({
  area, onPick, placeholder = "Add a place — search, or type your own…",
}: {
  area?: string | null;
  onPick: (title: string, area?: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<{ name: string; label: string }[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const s = q.trim();
    if (s.length < 3) { setResults([]); setBusy(false); return; }
    setBusy(true);
    const id = setTimeout(async () => {
      try {
        const query = area ? `${s}, ${area}` : s;
        const j = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": "en" } }).then((r) => r.json());
        const rows = Array.isArray(j) ? j.map((r: { display_name: string }) => ({
          name: r.display_name.split(",")[0].trim(),
          label: r.display_name.split(",").slice(0, 3).map((x) => x.trim()).join(", "),
        })) : [];
        setResults(rows);
      } catch { setResults([]); } finally { setBusy(false); }
    }, 400);
    return () => clearTimeout(id);
  }, [q, area]);

  function pick(title: string) {
    if (!title.trim()) return;
    onPick(title.trim(), area || undefined);
    setQ(""); setResults([]);
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
          <button onClick={() => pick(q)} className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-bold text-primary hover:bg-surface-2">
            <Plus size={14} className="shrink-0" /> Use &ldquo;{q.trim()}&rdquo; as a custom spot
          </button>
        </div>
      )}
    </div>
  );
}
