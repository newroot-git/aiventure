"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Sparkles, MapPin, Route, Tent, ArrowLeft, Plus, X, Navigation,
} from "lucide-react";
import { Button, Textarea, SelectTag, Label, Input, Avatar } from "@/components/ui";
import type { PlanScope } from "@/lib/types";

const SCOPES: {
  id: PlanScope; label: string; desc: string; Icon: typeof Sparkles;
}[] = [
  { id: "surprise", label: "Surprise me", desc: "Solo — I'm in the mood for something today.", Icon: Sparkles },
  { id: "single", label: "One thing", desc: "A single activity — a hike, dinner, a date.", Icon: MapPin },
  { id: "adventure", label: "An adventure", desc: "A day of activities, back to back.", Icon: Route },
  { id: "trip", label: "A trip", desc: "Multiple days away with the crew.", Icon: Tent },
];

const MOODS = ["Active", "Chilled", "Foodie", "Cultured", "Social", "Anything"];
const WHEN = ["Today", "Tonight", "This weekend", "Pick a date"];
const BUDGET = ["Free", "£", "££", "£££"];
const WHO = ["The boys", "Just me", "Invite people", "Open to all"];
const THINKING = [
  "Reading the vibe…", "Scanning real spots nearby…", "Checking what's on…",
  "Matching to your crew…", "Grounding every suggestion…",
];

export default function NewPlan() {
  return (
    <React.Suspense>
      <NewPlanFlow />
    </React.Suspense>
  );
}

function NewPlanFlow() {
  const router = useRouter();
  const scopeParam = useSearchParams().get("scope") as PlanScope | null;
  const [scope, setScope] = React.useState<PlanScope | null>(scopeParam);
  const [phase, setPhase] = React.useState<"config" | "loading">("config");

  // shared config
  const [intent, setIntent] = React.useState("");
  const [areas, setAreas] = React.useState<string[]>([]);
  const [areaInput, setAreaInput] = React.useState("");
  const [results, setResults] = React.useState<string[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [geo, setGeo] = React.useState<"idle" | "locating">("idle");
  const [mood, setMood] = React.useState("Anything");
  const [when, setWhen] = React.useState("This weekend");
  const [budget, setBudget] = React.useState("££");
  const [who, setWho] = React.useState("The boys");
  const [nights, setNights] = React.useState(3);
  const [tick, setTick] = React.useState(0);
  const [friends, setFriends] = React.useState<{ id: string; name: string; avatar?: string | null }[]>([]);
  const [invited, setInvited] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetch("/api/friends").then((r) => r.json()).then((d) => setFriends(d.friends ?? [])).catch(() => {});
  }, []);

  const location = areas.length ? areas.join(", ") : "London, UK";

  React.useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => setTick((t) => t + 1), 850);
    return () => clearInterval(id);
  }, [phase]);

  const meta = SCOPES.find((s) => s.id === scope);

  function addArea(a: string) {
    const v = a.trim();
    if (!v || areas.includes(v)) return;
    setAreas((p) => [...p, v]);
    setAreaInput("");
    setResults([]);
  }

  // debounced OSM Nominatim search for the area typeahead
  React.useEffect(() => {
    const q = areaInput.trim();
    if (q.length < 3) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "en" } },
        );
        const j = await res.json();
        const labels: string[] = Array.isArray(j)
          ? j.map((r: { display_name: string }) => r.display_name.split(",").slice(0, 3).map((s) => s.trim()).join(", "))
          : [];
        setResults([...new Set(labels)]);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(id);
  }, [areaInput]);
  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=12`,
            { headers: { "Accept-Language": "en" } },
          );
          const j = await res.json();
          const a = j.address ?? {};
          const place = a.city || a.town || a.village || a.suburb || a.county || j.name;
          addArea(place ? `${place}${a.country_code ? `, ${a.country_code.toUpperCase()}` : ""}` : "Near me");
        } catch {
          addArea("Near me");
        } finally {
          setGeo("idle");
        }
      },
      () => setGeo("idle"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  // create a plan — aiBuild=true fills slots via AI, false = empty named skeleton
  async function createPlan(aiBuild: boolean) {
    setPhase("loading");
    let interests: string[] = [];
    try {
      interests = JSON.parse(localStorage.getItem("aiventure_profile") || "{}").interests || [];
    } catch {}
    const intentText =
      scope === "surprise" ? `Something ${mood.toLowerCase()} to do ${when.toLowerCase()}` : intent;
    try {
      const res = await fetch("/api/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: scope ?? "single",
          intent: intentText,
          when,
          budget,
          who,
          nights,
          interests,
          location,
          aiBuild,
          inviteIds: invited,
        }),
      });
      const data = await res.json();
      if (res.ok && data.slug) {
        router.push(`/p/${data.slug}`);
        return;
      }
      throw new Error(data.error || "failed");
    } catch {
      router.push("/p/wild-otter-42"); // graceful fallback so it never dead-ends
    }
  }

  /* ---------- loading ---------- */
  if (phase === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-20 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary shadow-hard">
          <Loader2 size={40} className="animate-spin" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold">
          {scope === "adventure" || scope === "trip" ? "Building your adventure…" : "Building your plan…"}
        </h1>
        <p className="mt-3 h-6 text-[15px] font-bold text-primary">
          {THINKING[tick % THINKING.length]}
        </p>
      </main>
    );
  }

  /* ---------- scope picker ---------- */
  if (!scope) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <a href="/plans" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
          <ArrowLeft size={15} /> Home
        </a>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight">
          What are we doing?
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          From a quick idea to a whole trip — pick the scale.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => { setScope(s.id); setPhase("config"); }}
              className="flex items-center gap-4 rounded-xl border-2 border-ink bg-surface p-5 text-left shadow-hard transition active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep">
                <s.Icon size={24} />
              </span>
              <div>
                <div className="font-display text-xl font-bold">{s.label}</div>
                <div className="text-sm text-muted">{s.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  /* ---------- config (per scope) ---------- */
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-8">
      <button onClick={() => setScope(null)} className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Scale
      </button>
      <div className="mt-3 flex items-center gap-2">
        {meta && (
          <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep">
            <meta.Icon size={18} />
          </span>
        )}
        <h1 className="font-display text-2xl font-bold">{meta?.label}</h1>
      </div>

      {/* where — current location + add more areas */}
      <div className="mt-5">
        <Label>Where?</Label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geo === "locating"}
          className="mt-2 inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink shadow-hard-sm transition active:translate-y-0.5 disabled:opacity-60"
        >
          {geo === "locating" ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} className="text-primary" />}
          {geo === "locating" ? "Locating…" : "Use my location"}
        </button>
        {areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {areas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5 rounded-md border-2 border-line bg-surface px-3 py-1.5 text-sm font-bold">
                <MapPin size={13} className="text-primary" /> {a}
                <button onClick={() => setAreas((p) => p.filter((x) => x !== a))} className="text-muted"><X size={14} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="relative mt-3">
          <div className="flex gap-2">
            <div className="relative w-full">
              <Input
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArea(results[0] ?? areaInput))}
                placeholder="Search a place — town, area, postcode…"
                className="pr-9"
              />
              {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
            </div>
            <Button variant="soft" onClick={() => addArea(results[0] ?? areaInput)} disabled={!areaInput.trim()}>
              <Plus size={17} />
            </Button>
          </div>
          {results.length > 0 && (
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border-2 border-ink bg-surface shadow-hard">
              {results.map((r) => (
                <button
                  key={r}
                  onClick={() => addArea(r)}
                  className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-sm font-bold last:border-0 hover:bg-surface-2"
                >
                  <MapPin size={14} className="shrink-0 text-primary" /> <span className="truncate">{r}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">Search and tap a place, or use your location. Defaults to London if blank.</p>
      </div>

      {/* invite friends (optional) */}
      {scope !== "surprise" && friends.length > 0 && (
        <div className="mt-6">
          <Label>Invite anyone? (optional)</Label>
          <div className="mt-3 flex flex-wrap gap-3">
            {friends.map((f) => {
              const on = invited.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setInvited((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))}
                  className="flex flex-col items-center gap-1"
                >
                  <span className={on ? "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-bg" : ""}>
                    <Avatar name={f.name} src={f.avatar} size={44} />
                  </span>
                  <span className="truncate text-xs font-bold">{f.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* surprise */}
      {scope === "surprise" && (
        <div className="mt-6">
          <Label>What mood?</Label>
          <Chips opts={MOODS} value={mood} onChange={setMood} />
          <Chips label="When" opts={["Right now", "Today", "Tonight"]} value={when} onChange={setWhen} />
          <Button variant="primary" size="lg" className="mt-9 w-full" onClick={() => createPlan(true)}>
            <Sparkles size={18} /> Surprise me
          </Button>
        </div>
      )}

      {/* single */}
      {scope === "single" && (
        <div className="mt-6">
          <Textarea
            rows={3}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. something chill with the boys Saturday afternoon…"
            className="text-base"
          />
          <Chips label="When" opts={WHEN} value={when} onChange={setWhen} />
          <Chips label="Budget" opts={BUDGET} value={budget} onChange={setBudget} />
          <Chips label="Who" opts={WHO} value={who} onChange={setWho} />
          <DualCTA aiLabel="Build it with AI" aiIcon={<Sparkles size={18} />} disabled={!intent.trim()} onAi={() => createPlan(true)} onManual={() => createPlan(false)} />
        </div>
      )}

      {/* adventure */}
      {scope === "adventure" && (
        <div className="mt-6">
          <Textarea
            rows={3}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. a full Saturday — food, something active, then drinks…"
            className="text-base"
          />
          <Chips label="When" opts={WHEN} value={when} onChange={setWhen} />
          <Chips label="Who" opts={WHO} value={who} onChange={setWho} />
          <DualCTA aiLabel="Build the day with AI" aiIcon={<Route size={18} />} disabled={!intent.trim()} onAi={() => createPlan(true)} onManual={() => createPlan(false)} />
        </div>
      )}

      {/* trip */}
      {scope === "trip" && (
        <div className="mt-6">
          <Textarea
            rows={3}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. somewhere 2–4hrs away, outdoorsy, for a long weekend…"
            className="text-base"
          />
          <div className="mt-7">
            <Label>How many nights?</Label>
            <div className="mt-3 flex items-center gap-4">
              <Button variant="soft" size="sm" onClick={() => setNights((n) => Math.max(1, n - 1))}>−</Button>
              <span className="font-num text-2xl font-extrabold">{nights}</span>
              <Button variant="soft" size="sm" onClick={() => setNights((n) => n + 1)}>+</Button>
            </div>
          </div>
          <Chips label="Who" opts={WHO} value={who} onChange={setWho} />
          <DualCTA aiLabel="Plan the trip with AI" aiIcon={<Tent size={18} />} disabled={!intent.trim()} onAi={() => createPlan(true)} onManual={() => createPlan(false)} />
        </div>
      )}
    </main>
  );
}

function DualCTA({
  aiLabel, aiIcon, disabled, onAi, onManual,
}: {
  aiLabel: string; aiIcon: React.ReactNode; disabled?: boolean;
  onAi: () => void; onManual: () => void;
}) {
  return (
    <div className="mt-9 flex flex-col gap-2.5">
      <Button variant="primary" size="lg" className="w-full" disabled={disabled} onClick={onAi}>
        {aiIcon} {aiLabel}
      </Button>
      <Button variant="soft" size="lg" className="w-full" disabled={disabled} onClick={onManual}>
        I&apos;ll build it myself
      </Button>
      <p className="text-center text-xs text-muted">Build it yourself and ask AI for ideas on any step later.</p>
    </div>
  );
}

function Chips({
  label, opts, value, onChange,
}: {
  label?: string; opts: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="mt-7">
      {label && <Label>{label}</Label>}
      <div className="mt-3 flex flex-wrap gap-2">
        {opts.map((o) => (
          <SelectTag key={o} selected={value === o} onClick={() => onChange(o)}>
            {o}
          </SelectTag>
        ))}
      </div>
    </div>
  );
}
