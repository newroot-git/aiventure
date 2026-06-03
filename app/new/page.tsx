"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Sparkles, MapPin, Route, Tent, ArrowLeft, Plus, X, Wand2, Clock,
} from "lucide-react";
import { Button, Textarea, SelectTag, Label, Input } from "@/components/ui";
import { Tile } from "@/components/Tile";
import { AI_ACTIVITY_POOL } from "@/lib/mock";
import type { Activity, PlanScope } from "@/lib/types";

const SCOPES: {
  id: PlanScope; label: string; desc: string; Icon: typeof Sparkles; build?: boolean;
}[] = [
  { id: "surprise", label: "Surprise me", desc: "Solo — I'm in the mood for something today.", Icon: Sparkles },
  { id: "single", label: "One thing", desc: "A single activity — a hike, dinner, a date.", Icon: MapPin },
  { id: "adventure", label: "An adventure", desc: "A day of activities, back to back.", Icon: Route, build: true },
  { id: "trip", label: "A trip", desc: "Multiple days away with the crew.", Icon: Tent, build: true },
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
  const [phase, setPhase] = React.useState<"config" | "builder" | "loading">("config");

  // shared config
  const [intent, setIntent] = React.useState("");
  const [mood, setMood] = React.useState("Anything");
  const [when, setWhen] = React.useState("This weekend");
  const [budget, setBudget] = React.useState("££");
  const [who, setWho] = React.useState("The boys");
  const [nights, setNights] = React.useState(3);

  // itinerary
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [newAct, setNewAct] = React.useState("");
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => setTick((t) => t + 1), 850);
    return () => clearInterval(id);
  }, [phase]);

  const meta = SCOPES.find((s) => s.id === scope);

  // single + surprise: call the real AI agent, persist the plan, open it
  async function createPlan() {
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
          scope: "single",
          intent: intentText,
          when,
          budget,
          who,
          interests,
          location: "London, UK",
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
  const [building, setBuilding] = React.useState(false);
  async function aiBuild() {
    setBuilding(true);
    let interests: string[] = [];
    try {
      interests = JSON.parse(localStorage.getItem("aiventure_profile") || "{}").interests || [];
    } catch {}
    try {
      const res = await fetch("/api/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, intent, who, nights, interests, location: "London, UK" }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.activities) && data.activities.length) {
        setActivities(
          data.activities.map((a: Record<string, unknown>, i: number) => ({
            id: `ai${i}`,
            title: a.title as string,
            subtitle: a.subtitle as string | undefined,
            time: a.time as string | undefined,
            day: (a.day as number) ?? 1,
            place_name: a.place_name as string | undefined,
            why: a.why as string | undefined,
            tile: (a.tile as string) ?? "city",
          })),
        );
      } else {
        setActivities(AI_ACTIVITY_POOL.slice(0, scope === "trip" ? 5 : 4));
      }
    } catch {
      setActivities(AI_ACTIVITY_POOL.slice(0, scope === "trip" ? 5 : 4));
    } finally {
      setBuilding(false);
    }
  }
  // persist the built itinerary as an adventure, then open it
  async function createAdventure() {
    setPhase("loading");
    try {
      const res = await fetch("/api/adventures/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, intent, who, nights, activities }),
      });
      const data = await res.json();
      if (res.ok && data.slug) {
        router.push(`/a/${data.slug}`);
        return;
      }
      throw new Error(data.error || "failed");
    } catch {
      router.push("/a/epic-saturday");
    }
  }
  function addManual() {
    if (!newAct.trim()) return;
    setActivities((a) => [
      ...a,
      { id: `m${a.length}`, title: newAct.trim(), tile: "food" },
    ]);
    setNewAct("");
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

  /* ---------- itinerary builder (adventure / trip) ---------- */
  if (phase === "builder") {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-8">
        <button onClick={() => setPhase("config")} className="inline-flex items-center gap-1 text-sm font-bold text-muted">
          <ArrowLeft size={15} /> Back
        </button>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight">
          {scope === "trip" ? "Your itinerary" : "Your day"}
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Each stop is one activity. Let AI build it, or add your own.
        </p>

        <Button variant="secondary" className="mt-5 w-full" onClick={aiBuild} disabled={building}>
          {building ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}
          {building ? "Building your itinerary…" : "Let AI build it"}
        </Button>

        {activities.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {activities.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border-2 border-ink/10 bg-surface p-3">
                <Tile name={a.tile} className="h-14 w-14 shrink-0 border-2 border-ink/10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-white">{i + 1}</span>
                    {a.time && <span className="inline-flex items-center gap-1"><Clock size={11} /> {a.time}</span>}
                  </div>
                  <div className="truncate font-bold leading-tight">{a.title}</div>
                  {a.place_name && <div className="truncate text-sm text-muted">{a.place_name}</div>}
                </div>
                <button onClick={() => setActivities((x) => x.filter((y) => y.id !== a.id))} className="text-muted">
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* manual add */}
        <div className="mt-4 flex gap-2">
          <Input
            value={newAct}
            onChange={(e) => setNewAct(e.target.value)}
            placeholder="Add an activity…"
            onKeyDown={(e) => e.key === "Enter" && addManual()}
          />
          <Button variant="soft" onClick={addManual}>
            <Plus size={17} />
          </Button>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="mt-8 w-full"
          disabled={activities.length === 0}
          onClick={createAdventure}
        >
          Create {scope === "trip" ? "trip" : "adventure"} ({activities.length})
        </Button>
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

      {/* surprise */}
      {scope === "surprise" && (
        <div className="mt-6">
          <Label>What mood?</Label>
          <Chips opts={MOODS} value={mood} onChange={setMood} />
          <Chips label="When" opts={["Right now", "Today", "Tonight"]} value={when} onChange={setWhen} />
          <Button variant="primary" size="lg" className="mt-9 w-full" onClick={createPlan}>
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
          <Button variant="primary" size="lg" className="mt-9 w-full" disabled={!intent.trim()} onClick={createPlan}>
            <Sparkles size={18} /> Get the drop
          </Button>
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
          <Button variant="primary" size="lg" className="mt-9 w-full" disabled={!intent.trim()} onClick={() => setPhase("builder")}>
            <Route size={18} /> Build the day
          </Button>
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
              <span className="font-display text-2xl font-bold">{nights}</span>
              <Button variant="soft" size="sm" onClick={() => setNights((n) => n + 1)}>+</Button>
            </div>
          </div>
          <Chips label="Who" opts={WHO} value={who} onChange={setWho} />
          <Button variant="primary" size="lg" className="mt-9 w-full" disabled={!intent.trim()} onClick={() => setPhase("builder")}>
            <Tent size={18} /> Plan the trip
          </Button>
        </div>
      )}
    </main>
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
