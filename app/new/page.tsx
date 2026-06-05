"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Sparkles, MapPin, Route, Tent, ArrowLeft, Plus, X, Navigation,
  User, Users, Globe, CalendarDays, HelpCircle, ListChecks, Check, Link2,
} from "lucide-react";
import { Button, Textarea, SelectTag, Label, Input, Avatar } from "@/components/ui";
import { WhenPicker } from "@/components/plan";
import { AuroraField } from "@/components/atmosphere";
import type { PlanScope } from "@/lib/types";

const SCOPES: { id: PlanScope; label: string; desc: string; Icon: typeof Sparkles }[] = [
  { id: "surprise", label: "Surprise me", desc: "Solo — I'm in the mood for something today.", Icon: Sparkles },
  { id: "single", label: "One thing", desc: "A single activity — a hike, dinner, a date.", Icon: MapPin },
  { id: "adventure", label: "An adventure", desc: "A day of activities, back to back.", Icon: Route },
  { id: "trip", label: "A trip", desc: "Multiple days away with the crew.", Icon: Tent },
];

const THINKING = [
  "Reading the vibe…", "Scanning real spots nearby…", "Checking what's on…",
  "Matching to your crew…", "Grounding every suggestion…",
];

type WhoMode = "just-me" | "people" | "group" | "open";
type WhenMode = "unsure" | "options" | "set";
type Friend = { id: string; name: string; avatar?: string | null };
type Group = { id: string; name: string; members: { name: string }[] };

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

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
  const [error, setError] = React.useState<string | null>(null);

  // shared config
  const [intent, setIntent] = React.useState("");
  const [areas, setAreas] = React.useState<string[]>([]);
  const [areaInput, setAreaInput] = React.useState("");
  const [results, setResults] = React.useState<string[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [geo, setGeo] = React.useState<"idle" | "locating">("idle");
  const [mood, setMood] = React.useState("Anything");
  const [nights, setNights] = React.useState(3);
  const [tick, setTick] = React.useState(0);

  // who
  const [whoMode, setWhoMode] = React.useState<WhoMode>("just-me");
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [invited, setInvited] = React.useState<string[]>([]);
  const [groupId, setGroupId] = React.useState<string>("");

  // when
  const [whenMode, setWhenMode] = React.useState<WhenMode>("unsure");
  const [setDate, setSetDate] = React.useState<string | null>(null);
  const [dateOpts, setDateOpts] = React.useState<string[]>([]);

  // budget
  const [budgetFree, setBudgetFree] = React.useState(false);
  const [budgetAmt, setBudgetAmt] = React.useState("");
  const [linkCopied, setLinkCopied] = React.useState(false);

  async function copyAppLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {}
  }

  React.useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/friends", { signal: ctrl.signal }).then((r) => r.json()).then((d) => setFriends(d.friends ?? [])).catch(() => {});
    fetch("/api/groups", { signal: ctrl.signal }).then((r) => r.json()).then((d) => setGroups(d.groups ?? [])).catch(() => {});
    return () => ctrl.abort();
  }, []);

  // prefill the location from the saved onboarding profile's home area (same store as interests)
  React.useEffect(() => {
    try {
      const home = JSON.parse(localStorage.getItem("aiventure_profile") || "{}").home_area;
      if (typeof home === "string" && home.trim()) setAreas((p) => (p.length ? p : [home.trim()]));
    } catch {}
  }, []);

  // deep-link / quick-menu "surprise" → fire instantly, no questions
  React.useEffect(() => {
    if (scopeParam === "surprise") doSurprise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // empty when unspecified → server falls back to the creator's home area
  const location = areas.length ? areas.join(", ") : "";

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

  React.useEffect(() => {
    const q = areaInput.trim();
    if (q.length < 3) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "en" }, signal: ctrl.signal });
        const j = await res.json();
        const labels: string[] = Array.isArray(j) ? j.map((r: { display_name: string }) => r.display_name.split(",").slice(0, 3).map((s) => s.trim()).join(", ")) : [];
        setResults([...new Set(labels)]);
        setSearching(false);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") { setResults([]); setSearching(false); }
      }
    }, 400);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [areaInput]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=12`, { headers: { "Accept-Language": "en" } });
          const j = await res.json();
          const a = j.address ?? {};
          const place = a.city || a.town || a.village || a.suburb || a.county || j.name;
          addArea(place ? `${place}${a.country_code ? `, ${a.country_code.toUpperCase()}` : ""}` : "Near me");
        } catch { addArea("Near me"); } finally { setGeo("idle"); }
      },
      () => setGeo("idle"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  // Surprise me — no questions, just a random real plan (single activity or a day)
  async function doSurprise() {
    setScope("surprise");
    setPhase("loading");
    let interests: string[] = [];
    try { interests = JSON.parse(localStorage.getItem("aiventure_profile") || "{}").interests || []; } catch {}
    const moods = ["chilled", "active", "fun", "cultured", "social", "spontaneous", "outdoorsy", "low-key", "adventurous"];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    const bigDay = Math.random() < 0.4;
    const sc: PlanScope = bigDay ? "adventure" : "single";
    const intent = bigDay
      ? `Surprise us with a full day of ${mood} things to do — your pick, make it interesting`
      : `Surprise me with one ${mood} thing to do — your pick, something a bit different`;
    try {
      const res = await fetch("/api/plans/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: sc, intent, budget: "flexible", interests, location, aiBuild: true, visibility: "invite" }),
      });
      const data = await res.json();
      if (res.ok && data.slug) { router.push(`/p/${data.slug}`); return; }
      throw new Error(data.error || "failed");
    } catch { router.push("/plans"); }
  }

  async function createPlan(aiBuild: boolean) {
    setError(null);
    setPhase("loading");
    let interests: string[] = [];
    try { interests = JSON.parse(localStorage.getItem("aiventure_profile") || "{}").interests || []; } catch {}
    const intentText = scope === "surprise" ? `Something ${mood.toLowerCase()} to do soon` : intent;
    const budget = budgetFree ? "Free" : budgetAmt.trim() ? `~£${budgetAmt.trim()} per person` : "flexible";
    const surprise = scope === "surprise";
    try {
      const res = await fetch("/api/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: scope ?? "single",
          intent: intentText,
          budget,
          nights,
          interests,
          location,
          aiBuild,
          // who
          visibility: whoMode === "open" ? "open" : "invite",
          groupId: !surprise && whoMode === "group" ? groupId || null : null,
          inviteIds: !surprise && whoMode === "people" ? invited : [],
          // when
          startsAt: whenMode === "set" ? setDate : null,
          dateOptions: whenMode === "options" ? dateOpts : [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.slug) { router.push(`/p/${data.slug}`); return; }
      throw new Error(data.error || "Couldn't create the plan.");
    } catch (e) {
      // surface the failure instead of shipping a fake demo plan
      setError((e as Error)?.message || "Couldn't create the plan. Try again.");
      setPhase("config");
    }
  }

  /* ---------- loading ---------- */
  if (phase === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8">
        <AuroraField stars className="flex flex-col items-center rounded-2xl border-2 border-ink px-6 py-10 text-center text-white shadow-hard">
          <span className="relative grid h-20 w-20 place-items-center rounded-xl border-2 border-ink bg-accent text-ink shadow-hard-sm">
            <Sparkles size={36} className="animate-pulse" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold drop-shadow">
            {scope === "adventure" || scope === "trip" ? "Building your adventure…" : "Building your plan…"}
          </h1>
          <p className="mt-2 h-6 text-[15px] font-bold text-accent">{THINKING[tick % THINKING.length]}</p>
        </AuroraField>

        {/* shimmer skeletons hint at options assembling, one after another */}
        <div className="mt-5 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border-2 border-ink/15 bg-surface-2 p-4 shadow-hard-sm"
              style={{ animationDelay: `${i * 0.25}s` }}
            >
              <div className="h-4 w-2/3 rounded bg-ink/10" />
              <div className="mt-2 h-3 w-1/3 rounded bg-ink/10" />
              <div className="mt-3 h-3 w-full rounded bg-ink/5" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  /* ---------- scope picker ---------- */
  if (!scope) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <a href="/plans" className="inline-flex items-center gap-1 text-sm font-bold text-muted"><ArrowLeft size={15} /> Home</a>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight">What are we doing?</h1>
        <p className="mt-2 text-[15px] text-muted">From a quick idea to a whole trip — pick the scale.</p>
        <div className="mt-6 flex flex-col gap-3">
          {SCOPES.map((s) => (
            <button key={s.id} onClick={() => { if (s.id === "surprise") { doSurprise(); } else { setScope(s.id); setPhase("config"); } }}
              className="flex items-center gap-4 rounded-xl border-2 border-ink bg-surface p-5 text-left shadow-hard transition active:translate-x-1 active:translate-y-1 active:shadow-none">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep"><s.Icon size={24} /></span>
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

  const isSurprise = scope === "surprise";

  /* ---------- config ---------- */
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-8">
      <button onClick={() => setScope(null)} className="inline-flex items-center gap-1 text-sm font-bold text-muted"><ArrowLeft size={15} /> Scale</button>
      <div className="mt-3 flex items-center gap-2">
        {meta && <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep"><meta.Icon size={18} /></span>}
        <h1 className="font-display text-2xl font-bold">{meta?.label}</h1>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border-2 border-[#c0392b] bg-[#c0392b]/10 px-3 py-2 text-sm font-bold text-[#c0392b]">
          {error}
        </p>
      )}

      {/* intent (non-surprise) */}
      {!isSurprise && (
        <Textarea
          rows={3}
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder={scope === "trip" ? "e.g. somewhere 2–4hrs away, outdoorsy, long weekend…" : scope === "adventure" ? "e.g. a full Saturday — food, something active, then drinks…" : "e.g. something chill with the boys Saturday afternoon…"}
          className="mt-5 text-base"
        />
      )}

      {/* where */}
      <div className="mt-7">
        <Label>Where?</Label>
        <button type="button" onClick={useMyLocation} disabled={geo === "locating"}
          className="mt-2 inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink shadow-hard-sm transition active:translate-y-0.5 disabled:opacity-60">
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
              <Input value={areaInput} onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArea(results[0] ?? areaInput))}
                placeholder="Search a place — town, area, postcode…" className="pr-9" />
              {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
            </div>
            <Button variant="soft" onClick={() => addArea(results[0] ?? areaInput)} disabled={!areaInput.trim()}><Plus size={17} /></Button>
          </div>
          {results.length > 0 && (
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border-2 border-ink bg-surface shadow-hard">
              {results.map((r) => (
                <button key={r} onClick={() => addArea(r)} className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-sm font-bold last:border-0 hover:bg-surface-2">
                  <MapPin size={14} className="shrink-0 text-primary" /> <span className="truncate">{r}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">Search and tap a place, or use your location. Defaults to your home area if blank.</p>
      </div>

      {/* WHO — one section with all the optionality */}
      {!isSurprise && (
        <div className="mt-7">
          <Label>Who&apos;s coming?</Label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ModeTile active={whoMode === "just-me"} Icon={User} label="Just me" onClick={() => setWhoMode("just-me")} />
            <ModeTile active={whoMode === "people"} Icon={Users} label="Invite people" onClick={() => setWhoMode("people")} />
            <ModeTile active={whoMode === "group"} Icon={Users} label="A group" onClick={() => setWhoMode("group")} disabled={!groups.length} />
            <ModeTile active={whoMode === "open"} Icon={Globe} label="Open to all" onClick={() => setWhoMode("open")} />
          </div>
          {whoMode === "people" && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {friends.map((f) => {
                const on = invited.includes(f.id);
                return (
                  <button key={f.id} type="button" onClick={() => setInvited((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))} className="flex min-w-0 flex-col items-center gap-1">
                    <span className={on ? "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-bg" : ""}><Avatar name={f.name} src={f.avatar} size={44} /></span>
                    <span className="w-full truncate text-center text-xs font-bold">{f.name}</span>
                  </button>
                );
              })}
              {/* invite someone not on the app — copy a share link */}
              <button type="button" onClick={copyAppLink} className="flex min-w-0 flex-col items-center gap-1">
                <span className="grid h-11 w-11 place-items-center rounded-md border-2 border-dashed border-ink/40 bg-surface text-primary">
                  {linkCopied ? <Check size={20} /> : <Link2 size={20} />}
                </span>
                <span className="w-full truncate text-center text-xs font-bold text-muted">{linkCopied ? "Copied" : "Invite link"}</span>
              </button>
            </div>
          )}
          {whoMode === "group" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {groups.map((g) => (
                <SelectTag key={g.id} selected={groupId === g.id} onClick={() => setGroupId(g.id)}>{g.name} · {g.members.length}</SelectTag>
              ))}
            </div>
          )}
          {whoMode === "open" && <p className="mt-2 text-xs text-muted">Anyone with the link can join.</p>}
        </div>
      )}

      {/* WHEN — not sure / a few options / set date */}
      <div className="mt-7">
        <Label>When?</Label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ModeTile active={whenMode === "unsure"} Icon={HelpCircle} label="Not sure yet" onClick={() => setWhenMode("unsure")} small />
          <ModeTile active={whenMode === "options"} Icon={ListChecks} label="A few options" onClick={() => setWhenMode("options")} small />
          <ModeTile active={whenMode === "set"} Icon={CalendarDays} label="Set date" onClick={() => setWhenMode("set")} small />
        </div>
        {whenMode === "set" && (
          <div className="mt-3">
            <WhenPicker value={setDate} onChange={setSetDate} />
          </div>
        )}
        {whenMode === "options" && (
          <div className="mt-3">
            {dateOpts.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {dateOpts.map((iso) => (
                  <span key={iso} className="inline-flex items-center gap-2 rounded-md border-2 border-line bg-surface px-3 py-1.5 text-sm font-bold">
                    <Check size={13} className="text-success" /> {fmtDT(iso)}
                    <button onClick={() => setDateOpts((p) => p.filter((x) => x !== iso))} className="ml-auto text-muted"><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}
            <WhenPicker multiple onPickMany={(isos) => setDateOpts((p) => [...new Set([...p, ...isos])])} />
            <p className="mt-1 text-xs text-muted">Tap a few days — everyone marks which work, you lock one later.</p>
          </div>
        )}
        {whenMode === "unsure" && <p className="mt-2 text-xs text-muted">Leave it open — figure out the day together later.</p>}
      </div>

      {/* BUDGET */}
      {!isSurprise && (
        <div className="mt-7">
          <Label>Budget</Label>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => setBudgetFree((f) => !f)}
              className={`rounded-md border-2 px-4 py-2.5 text-sm font-bold transition ${budgetFree ? "border-ink bg-success text-white shadow-hard-sm" : "border-line text-ink hover:border-primary"}`}>
              Free
            </button>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">£</span>
              <Input type="number" inputMode="numeric" value={budgetAmt} disabled={budgetFree}
                onChange={(e) => setBudgetAmt(e.target.value)} placeholder="per person" className="pl-7 disabled:opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* trip nights */}
      {scope === "trip" && (
        <div className="mt-7">
          <Label>How many nights?</Label>
          <div className="mt-3 flex items-center gap-4">
            <Button variant="soft" size="sm" onClick={() => setNights((n) => Math.max(1, n - 1))}>−</Button>
            <span className="font-num text-2xl font-extrabold">{nights}</span>
            <Button variant="soft" size="sm" onClick={() => setNights((n) => n + 1)}>+</Button>
          </div>
        </div>
      )}

      {/* CTA (surprise never reaches config — it fires instantly) */}
      <DualCTA
        aiLabel={scope === "trip" ? "Plan the trip with AI" : scope === "adventure" ? "Build the day with AI" : "Build it with AI"}
        aiIcon={scope === "trip" ? <Tent size={18} /> : scope === "adventure" ? <Route size={18} /> : <Sparkles size={18} />}
        disabled={!intent.trim()}
        onAi={() => createPlan(true)}
        onManual={() => createPlan(false)}
      />
    </main>
  );
}

function ModeTile({
  active, Icon, label, onClick, disabled, small,
}: {
  active: boolean; Icon: typeof User; label: string; onClick: () => void; disabled?: boolean; small?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-md border-2 ${small ? "px-2 py-2.5 text-xs" : "px-3 py-3 text-sm"} font-bold transition disabled:opacity-40 ${active ? "border-ink bg-primary text-white shadow-hard-sm" : "border-line text-ink hover:border-primary"}`}>
      <Icon size={small ? 15 : 17} /> {label}
    </button>
  );
}

function DualCTA({
  aiLabel, aiIcon, disabled, onAi, onManual,
}: {
  aiLabel: string; aiIcon: React.ReactNode; disabled?: boolean; onAi: () => void; onManual: () => void;
}) {
  return (
    <div className="mt-9 flex flex-col gap-2.5">
      <Button variant="primary" size="lg" className="w-full" disabled={disabled} onClick={onAi}>{aiIcon} {aiLabel}</Button>
      {/* building it yourself needs no description */}
      <Button variant="soft" size="lg" className="w-full" onClick={onManual}>I&apos;ll build it myself</Button>
      <p className="text-center text-xs text-muted">{disabled ? "Add a description for AI, or just build it yourself." : "Build it yourself and ask AI for ideas on any step later."}</p>
    </div>
  );
}

