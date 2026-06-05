"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Link2,
  CalendarDays,
  Clock,
  MapPin,
  Lock,
  Sparkles,
  Check,
  Share2,
  HeartHandshake,
  Info,
  Loader2,
  Plus,
  RotateCw,
  X,
  UserPlus,
  Route,
  Wand2,
  Trash2,
  Repeat,
  Pencil,
  Hand,
} from "lucide-react";
import { Pill, Button, AvatarStack, Avatar } from "./ui";
import { Reveal } from "./motion";
import {
  OptionCard,
  RSVPControl,
  KeyInfoChips,
  AdventureCard,
  WhenPicker,
} from "./plan";
import { PlanMap } from "./PlanMap";
import { PlaceSearch } from "./PlaceSearch";
import type { Plan, PlanOption, PlanMember, RSVP, Profile, PlanStatus } from "@/lib/types";
import type { PlanScaffoldSlot, PlanRecurrence, DateOption } from "@/lib/db";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "16:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
function fmtTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function googleCalUrl(plan: Plan) {
  if (!plan.starts_at) return "#";
  const start = new Date(plan.starts_at);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.activity ?? plan.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: plan.why ?? "",
    location: plan.place_address ?? plan.place_name ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/* ---- group flat options + scaffold into ordered, voteable slots ---- */
interface Slot {
  id: string; // `${day}:${key}`
  key: string;
  label: string;
  day: number;
  order: number;
  fixed: boolean;
  options: PlanOption[];
  chosen?: PlanOption;
}
function buildSlots(options: PlanOption[], scaffold: PlanScaffoldSlot[]): Slot[] {
  const map = new Map<string, Slot>();
  // seed from scaffold so empty slots still render
  scaffold.forEach((s) => {
    const id = `${s.day}:${s.key}`;
    map.set(id, { id, key: s.key, label: s.label, day: s.day, order: s.order, fixed: !!s.fixed, options: [] });
  });
  options.forEach((o) => {
    const p = (o.payload ?? {}) as Record<string, unknown>;
    const key = (p.slot as string) || "plan";
    const day = (p.day as number) || 1;
    const id = `${day}:${key}`;
    let slot = map.get(id);
    if (!slot) {
      slot = {
        id, key,
        label: (p.slot_label as string) || "The plan",
        day,
        order: (p.slot_order as number) ?? map.size,
        fixed: !!p.fixed,
        options: [],
      };
      map.set(id, slot);
    }
    slot.options.push(o);
    if (p.chosen) slot.chosen = o;
  });
  // most-voted options rise to the top of each slot (human still picks)
  for (const s of map.values()) s.options.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  return [...map.values()].sort((a, b) => a.day - b.day || a.order - b.order);
}

function chosenTime(slot: Slot): string | null {
  const p = (slot.chosen?.payload ?? {}) as Record<string, unknown>;
  return (p.time as string) || null;
}

/* labelled section block */
function Section({
  icon, label, tone = "primary", children, className,
}: {
  icon: React.ReactNode; label: string;
  tone?: "primary" | "secondary" | "accent" | "success";
  children: React.ReactNode; className?: string;
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary-deep",
    secondary: "bg-secondary-soft text-secondary",
    accent: "bg-accent-soft text-[#8a6512]",
    success: "bg-success-soft text-success",
  }[tone];
  return (
    <section className={`rounded-xl border-2 border-ink/10 bg-surface p-5 shadow-soft ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-md ${toneCls}`}>{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      </div>
      {children}
    </section>
  );
}

export function PlanView({
  plan,
  options,
  members,
  friends = [],
  scaffold = [],
  recurrence = null,
  dateOptions = [],
  myRsvp = null,
  isOwner = true,
}: {
  plan: Plan;
  options: PlanOption[];
  members: PlanMember[];
  friends?: Profile[];
  scaffold?: PlanScaffoldSlot[];
  recurrence?: PlanRecurrence | null;
  dateOptions?: DateOption[];
  myRsvp?: RSVP | null;
  isOwner?: boolean;
}) {
  // ---- optimistic overlay --------------------------------------------------
  // Edits apply to local state INSTANTLY; the server write + a background
  // router.refresh() reconcile quietly behind it. Each override clears when the
  // matching server prop changes (i.e. once the refresh confirms the new truth),
  // so the prop is always the eventual source of truth.
  const router = useRouter();
  const [, startBgRefresh] = React.useTransition();
  const bgRefresh = React.useCallback(() => startBgRefresh(() => router.refresh()), [router]);

  const [optStatus, setOptStatus] = React.useState<PlanStatus | null>(null);
  const [optChosen, setOptChosen] = React.useState<Record<string, string>>({});
  const [optPlan, setOptPlan] = React.useState<Partial<Pick<Plan, "activity" | "starts_at" | "place_address" | "place_name">>>({});
  const [optRec, setOptRec] = React.useState<{ set: boolean; val: PlanRecurrence | null }>({ set: false, val: null });
  // Reconcile: a background refresh re-serialises all server props with fresh
  // identities, so when `plan` changes we drop every optimistic override and let
  // the server truth take over. Render-phase reset (React's documented pattern for
  // "adjust state when a prop changes") — no effect, no extra render pass.
  const [prevPlan, setPrevPlan] = React.useState(plan);
  if (plan !== prevPlan) {
    setPrevPlan(plan);
    setOptStatus(null); setOptChosen({}); setOptPlan({}); setOptRec({ set: false, val: null });
  }

  const effPlan = React.useMemo(() => ({ ...plan, ...optPlan }), [plan, optPlan]);
  const effRecurrence = optRec.set ? optRec.val : recurrence;

  const slots = React.useMemo(() => {
    const base = buildSlots(options, scaffold);
    for (const s of base) {
      const oid = optChosen[s.id];
      if (oid) { const o = s.options.find((x) => x.id === oid); if (o) s.chosen = o; }
    }
    return base;
  }, [options, scaffold, optChosen]);
  const dayNums = React.useMemo(() => [...new Set(slots.map((s) => s.day))].sort((a, b) => a - b), [slots]);
  const multiDay = dayNums.length > 1;
  const multiStep = slots.length > 1;
  const decidedCount = slots.filter((s) => s.fixed || s.chosen).length;
  const allDecided = slots.length > 0 && decidedCount === slots.length;

  // chosen, located activities for the map (hint = neighbourhood from subtitle, for geocode fallback)
  const pins = React.useMemo(
    () => slots
      .map((s) => {
        if (!s.chosen) return null;
        const p = (s.chosen.payload ?? {}) as Record<string, unknown>;
        const place = (p.place_name as string) || s.chosen.title;
        const sub = s.chosen.subtitle ?? "";
        const hint = sub.includes("·") ? sub.split("·").pop()!.trim() : "";
        return place ? { label: s.chosen.title, place: place as string, hint } : null;
      })
      .filter(Boolean) as { label: string; place: string; hint: string }[],
    [slots],
  );

  const [rsvp, setRsvpState] = React.useState<RSVP>(myRsvp ?? "in");
  const [votes, setVotes] = React.useState<Record<string, number>>(
    Object.fromEntries(options.map((o) => [o.id, o.votes])),
  );
  const [voted, setVoted] = React.useState<Record<string, boolean>>(
    Object.fromEntries(options.filter((o) => o.mine).map((o) => [o.id, true])),
  );
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  // per-slot "working" key (e.g. `${slot.id}:refine`) so only the active slot shows a spinner
  const [working, setWorking] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [pickedFriends, setPickedFriends] = React.useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(false);
  const [titleVal, setTitleVal] = React.useState(plan.activity ?? plan.title);
  const [editLoc, setEditLoc] = React.useState(false);
  const [locVal, setLocVal] = React.useState(plan.place_address ?? "");
  const [poked, setPoked] = React.useState(false);

  const phase = optStatus ?? plan.status;
  const planning = phase === "open";
  const people = members.map((m) => m.profile ?? { name: "Guest" });
  const generalArea = effPlan.place_address || effPlan.place_name || "TBC";

  // fire the write, then reconcile in the background — never blocks the optimistic UI
  const persist = React.useCallback((body: Record<string, unknown>) => {
    return fetch("/api/plans/edit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: plan.slug, ...body }),
    }).then(() => bgRefresh());
  }, [plan.slug, bgRefresh]);
  // slotId comes from the PlanSlot that owns the option, so the pick shows instantly
  const choose = React.useCallback((slotId: string, id: string) => {
    setOptChosen((prev) => ({ ...prev, [slotId]: id }));
    persist({ action: "choose", optionId: id });
  }, [persist]);
  const setWhenDate = (iso: string) => { setOptPlan((p) => ({ ...p, starts_at: iso })); persist({ action: "when", startsAt: iso }); };
  async function doInvite() {
    if (!pickedFriends.length) return;
    setInviteOpen(false);
    setPickedFriends([]);
    await persist({ action: "invite", profileIds: pickedFriends });
  }
  async function move(status: "open" | "locked" | "completed") {
    setOptStatus(status); // hero + actions flip instantly
    setBusy(true);
    try {
      await fetch("/api/plans/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, status }),
      });
      bgRefresh();
    } finally { setBusy(false); }
  }
  const vote = React.useCallback((id: string) => {
    setVoted((v) => {
      const now = !v[id];
      setVotes((vs) => ({ ...vs, [id]: Math.max(0, (vs[id] ?? 0) + (now ? 1 : -1)) }));
      return { ...v, [id]: now };
    });
    fetch("/api/plans/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: id }),
    }).catch(() => {});
  }, []);
  function changeRsvp(v: RSVP) {
    // declining drops the plan off your calendar/home — guard against a misclick
    if (v === "out" && !window.confirm("Can't make it? This plan will drop off your plans. You can still reopen it from the link.")) return;
    setRsvpState(v);
    persist({ action: "rsvp", rsvp: v });
  }
  const deleteOpt = React.useCallback((optionId: string) => persist({ action: "deleteOption", optionId }), [persist]);
  const addDateOpt = (iso: string) => persist({ action: "addDate", iso });
  const lockDateOpt = (optionId: string) => persist({ action: "lockDate", optionId });
  function voteDate(id: string) {
    setVoted((v) => ({ ...v, [id]: !v[id] }));
    fetch("/api/plans/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: id }),
    }).then(() => bgRefresh()).catch(() => {});
  }
  // Ask AI: append=true adds more ideas (keeps existing); append=false re-rolls the slot
  const onRefine = React.useCallback(async (slotKey: string, day: number, feedback: string, append = true) => {
    setWorking(`${day}:${slotKey}:refine`);
    try {
      await fetch("/api/plans/refine", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, slotKey, day, feedback, append }),
      });
      bgRefresh();
    } finally { setWorking(null); }
  }, [plan.slug, bgRefresh]);
  // "Ask AI to find <text>" — resolve a typed name to a real venue and add it
  const onResolveAdd = React.useCallback(async (slotKey: string, day: number, query: string) => {
    if (!query.trim()) return;
    setWorking(`${day}:${slotKey}:add`);
    try {
      await fetch("/api/plans/add-option", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, title: query, slotKey, day, ai: true }),
      });
      bgRefresh();
    } finally { setWorking(null); }
  }, [plan.slug, bgRefresh]);
  const refineAll = React.useCallback(async (day: number | undefined, feedback: string) => {
    setWorking(`all:${day ?? 0}`);
    try {
      await fetch("/api/plans/refine", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, all: true, day, feedback }),
      });
      bgRefresh();
    } finally { setWorking(null); }
  }, [plan.slug, bgRefresh]);
  const onAddOwn = React.useCallback(async (slotKey: string, day: number, title: string, area?: string) => {
    if (!title.trim()) return;
    setWorking(`${day}:${slotKey}:add`);
    try {
      await fetch("/api/plans/add-option", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, title, area, slotKey, day }),
      });
      bgRefresh();
    } finally { setWorking(null); }
  }, [plan.slug, bgRefresh]);
  const addStep = React.useCallback(async (day: number, label: string) => {
    const t = label.trim();
    if (!t) return;
    await persist({ action: "addSlot", label: t, day });
  }, [persist]);
  const onSetSlotTime = React.useCallback((slotKey: string, day: number, time: string | null) =>
    persist({ action: "slotTime", slotKey, day, time }), [persist]);
  async function toggleRecurring(next: PlanRecurrence | null) {
    // turning OFF after it's locked (materialised) wipes future instances — confirm
    if (next === null && phase !== "open") {
      if (!window.confirm("This is a recurring series — turning it off will remove all the future repeats. Continue?")) return;
      setOptRec({ set: true, val: null });
      await persist({ action: "stopSeries" });
      return;
    }
    setOptRec({ set: true, val: next });
    await persist({ action: "recurrence", recurrence: next });
  }
  async function doDelete() {
    setBusy(true);
    await fetch("/api/plans/edit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: plan.slug, action: "delete" }),
    });
    router.push("/plans");
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }
  async function saveTitle() {
    setEditTitle(false);
    const t = titleVal.trim();
    if (t && t !== (plan.activity ?? plan.title)) { setOptPlan((p) => ({ ...p, activity: t })); await persist({ action: "title", title: t }); }
  }
  async function saveLocation() {
    setEditLoc(false);
    const l = locVal.trim();
    if (l && l !== plan.place_address) { setOptPlan((p) => ({ ...p, place_address: l, place_name: l })); await persist({ action: "location", location: l }); }
  }
  async function poke() {
    setPoked(true);
    await fetch("/api/plans/edit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: plan.slug, action: "poke" }),
    });
    setTimeout(() => setPoked(false), 2200);
  }

  if (phase === "completed") {
    return (
      <div className="mx-auto w-full max-w-lg py-8">
        <p className="mb-5 text-center font-display text-2xl font-bold">Adventure logged</p>
        <AdventureCard
          number={plan.adventure_no ?? 1}
          activity={plan.activity ?? plan.title}
          place={multiStep ? generalArea : plan.place_name}
          dateLabel={fmtDate(plan.starts_at)}
          people={people}
          cover={plan.cover_url}
        />
        <div className="mt-5 flex gap-3">
          <Button variant="primary" className="flex-1" onClick={copyLink}>
            <Share2 size={17} /> {copied ? "Copied" : "Share"}
          </Button>
          <Button variant="soft" disabled={busy} onClick={() => move("locked")}>Reopen</Button>
        </div>
        <Link href="/plans" className="mt-6 block text-center text-sm font-bold text-muted underline">
          See all your adventures
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-xl border-2 border-ink shadow-hard">
        {plan.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plan.cover_url} alt={plan.activity ?? plan.title} className="h-52 w-full object-cover" />
        ) : (
          <div className="aurora h-52 w-full" />
        )}
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-2 p-3">
          {phase === "locked" ? (
            <Pill tone="success" className="border-2 border-ink/10"><Lock size={13} /> Locked in</Pill>
          ) : (
            <Pill tone="accent" className="border-2 border-ink/10"><Sparkles size={13} /> Planning</Pill>
          )}
          {multiDay && (
            <Pill tone="primary" className="border-2 border-ink/10"><Route size={13} /> {dayNums.length}-day trip</Pill>
          )}
          {effRecurrence && (
            <Pill tone="secondary" className="border-2 border-ink/10"><Repeat size={13} /> Weekly</Pill>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10">
          {editTitle ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                className="w-full rounded-md border-2 border-white/60 bg-black/40 px-2 py-1 font-heading text-xl font-extrabold text-white outline-none"
              />
              <button onClick={saveTitle} className="rounded-md border-2 border-white/60 bg-black/40 px-2 text-white"><Check size={18} /></button>
            </div>
          ) : (
            <h1
              className="flex items-center gap-2 font-heading text-2xl font-extrabold leading-tight text-white drop-shadow"
              onClick={() => isOwner && planning && (setTitleVal(effPlan.activity ?? effPlan.title), setEditTitle(true))}
            >
              {effPlan.activity ?? effPlan.title}
              {isOwner && planning && <Pencil size={15} className="shrink-0 opacity-70" />}
            </h1>
          )}
        </div>
      </div>

      {/* when / where */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Section icon={<Clock size={15} />} label={effRecurrence ? "Repeats" : "When"} tone="accent">
          {effRecurrence ? (
            <div className="font-bold leading-tight">
              {effRecurrence.cadence === "monthly"
                ? `Monthly · ${ordinal(effRecurrence.monthday ?? 1)}`
                : `${effRecurrence.cadence === "biweekly" ? "Fortnightly" : "Weekly"} · ${WEEKDAYS[effRecurrence.weekday]}`}
              {effRecurrence.time ? ` · ${effRecurrence.time}` : ""}
            </div>
          ) : (
            <>
              <div className="font-bold leading-tight">{fmtDate(effPlan.starts_at) ?? (isOwner ? "Pick a time" : "TBC")}</div>
              {fmtTime(effPlan.starts_at) && <div className="text-sm text-muted">{fmtTime(effPlan.starts_at)}</div>}
              {isOwner && planning && <WhenPicker value={effPlan.starts_at} onChange={setWhenDate} />}
            </>
          )}
        </Section>
        <Section icon={<MapPin size={15} />} label={multiStep ? "Area" : "Where"} tone="primary">
          {editLoc ? (
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={locVal}
                onChange={(e) => setLocVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveLocation()}
                placeholder="Area or town"
                className="w-full rounded-md border-2 border-line bg-surface px-2 py-1 text-sm font-bold outline-none focus:border-primary"
              />
              <button onClick={saveLocation} className="shrink-0 text-primary"><Check size={16} /></button>
            </div>
          ) : (
            <>
              <div className="font-bold leading-tight">{multiStep ? generalArea : (effPlan.place_name ?? effPlan.place_address ?? "TBC")}</div>
              {multiStep
                ? <div className="text-sm text-muted">{pins.length} stop{pins.length === 1 ? "" : "s"}</div>
                : (effPlan.place_name && effPlan.place_address) && <div className="text-sm text-muted">{effPlan.place_address}</div>}
              {isOwner && planning && (
                <button onClick={() => { setLocVal(effPlan.place_address ?? ""); setEditLoc(true); }} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">
                  <Pencil size={11} /> Change area
                </button>
              )}
            </>
          )}
        </Section>
      </div>

      {/* recurring — part of choosing the when (right under the date pickers) */}
      {isOwner && planning && (
        <div className="mt-3">
          <RecurringControl recurrence={effRecurrence} defaultStart={effPlan.starts_at} onChange={toggleRecurring} />
        </div>
      )}
      {!isOwner && effRecurrence && (
        <div className="mt-3">
          <Section icon={<Repeat size={15} />} label="Recurring" tone="secondary">
            <p className="text-sm font-bold">{effRecurrence.cadence === "monthly" ? "Repeats monthly" : effRecurrence.cadence === "biweekly" ? "Repeats fortnightly" : "Repeats weekly"}</p>
          </Section>
        </div>
      )}

      {/* multi-pin map for itineraries */}
      {pins.length >= 1 && <div className="mt-3"><PlanMap pins={pins} area={plan.place_address} /></div>}

      {/* availability — propose dates, mark which work, owner locks one */}
      {!effRecurrence && (dateOptions.length > 0 || (planning && !effPlan.starts_at)) && (
        <div className="mt-4">
          <Section icon={<CalendarDays size={15} />} label="When works?" tone="accent">
            {dateOptions.length === 0 && (
              <p className="mb-3 text-sm text-muted">Not pinned to a day yet — add a few options and everyone marks what works.</p>
            )}
            <div className="flex flex-col gap-2">
              {(() => {
                const maxV = Math.max(0, ...dateOptions.map((d) => d.votes));
                return [...dateOptions].sort((a, b) => b.votes - a.votes).map((d) => {
                  const ideal = maxV > 0 && d.votes === maxV;
                  return (
                    <div key={d.id} className={`flex items-center gap-2 rounded-md border-2 p-2 ${ideal ? "border-success bg-success-soft/40" : "border-line bg-surface"}`}>
                      <button
                        onClick={() => voteDate(d.id)}
                        className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-bold transition ${voted[d.id] ? "text-success" : "text-ink"}`}
                      >
                        <Check size={15} className={voted[d.id] ? "opacity-100" : "opacity-30"} />
                        {fmtDate(d.iso)}{fmtTime(d.iso) ? ` · ${fmtTime(d.iso)}` : ""}
                      </button>
                      {ideal && <span className="rounded bg-success px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Best</span>}
                      <span className="text-xs font-bold text-muted">{d.votes} free</span>
                      {isOwner && (
                        <Button variant="soft" size="sm" onClick={() => lockDateOpt(d.id)}>
                          <Lock size={13} /> Set
                        </Button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            {planning && (
              <div className="mt-2">
                <WhenPicker multiple onPickMany={(isos) => isos.forEach(addDateOpt)} />
                <p className="mt-1 text-xs text-muted">Tap the days that work — anyone can add, everyone marks what suits.</p>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* who */}
      <div className="mt-4">
        <Section icon={<Users size={15} />} label="Who's in" tone="success">
          <div className="mb-3 flex items-center justify-between">
            <AvatarStack people={people} />
            <span className="text-sm font-bold text-muted">
              {members.filter((m) => m.rsvp === "in").length} {effRecurrence ? "in this week" : "going"}
            </span>
          </div>
          <RSVPControl value={rsvp} onChange={changeRsvp} />
          {friends.length > 0 && (
            <button onClick={() => setInviteOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
              <UserPlus size={15} /> Invite people
            </button>
          )}
        </Section>
      </div>

      {/* why */}
      {plan.why && (
        <div className="mt-4">
          <Section icon={<HeartHandshake size={15} />} label="Why this" tone="secondary">
            <p className="text-[15px] leading-relaxed text-ink/80">{plan.why}</p>
          </Section>
        </div>
      )}

      {/* slots */}
      {slots.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-xl font-bold">
              <Sparkles size={18} className="text-secondary" /> {multiDay ? "The itinerary" : "The plan"}
            </h2>
            {multiStep && <span className="text-sm font-bold text-muted">{decidedCount}/{slots.length} set</span>}
          </div>

          {/* whole-plan feedback (single-day) */}
          {isOwner && planning && multiStep && !multiDay && (
            <GeneralFeedback
              busy={working === "all:0"}
              onSubmit={(v) => refineAll(undefined, v)}
              placeholder="Tweak the whole plan — e.g. keep it cheaper, more outdoorsy…"
            />
          )}

          {(() => {
            let idx = 0;
            return dayNums.map((d) => (
              <div key={d} className="mb-2">
                {multiDay && (
                  <div className="mb-2 mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Day {d}</span>
                  </div>
                )}
                {isOwner && planning && multiDay && (
                  <GeneralFeedback
                    busy={working === `all:${d}`}
                    onSubmit={(v) => refineAll(d, v)}
                    placeholder={`Tweak all of day ${d} at once…`}
                  />
                )}
                <div className="mt-2 flex flex-col gap-5">
                  {slots.filter((s) => s.day === d).map((s) => {
                    const i = idx++;
                    return (
                      <Reveal key={s.id} delay={Math.min(i, 5) * 0.05}>
                        <PlanSlot
                          slot={s} index={i} isOwner={isOwner} planning={planning} working={working}
                          votes={votes} voted={voted} placeArea={plan.place_address}
                          onVote={vote} onChoose={choose} onDeleteOpt={deleteOpt}
                          onRefine={onRefine} onAddOwn={onAddOwn} onResolveAdd={onResolveAdd} onSetSlotTime={onSetSlotTime}
                        />
                      </Reveal>
                    );
                  })}
                </div>
                {isOwner && planning && <AddStepBox onAdd={(label) => addStep(d, label)} />}
              </div>
            ));
          })()}
        </section>
      )}

      {/* good to know */}
      {plan.key_info?.length > 0 && (
        <div className="mt-4">
          <Section icon={<Info size={15} />} label="Good to know" tone="accent">
            <KeyInfoChips items={plan.key_info} />
          </Section>
        </div>
      )}

      {/* actions */}
      <section className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <Button variant="soft" className="flex-1" onClick={copyLink}>
            <Link2 size={17} /> {copied ? "Link copied" : "Invite"}
          </Button>
          <a href={googleCalUrl(plan)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="soft" className="w-full"><CalendarDays size={17} /> Calendar</Button>
          </a>
        </div>

        {/* poke non-voters (owner, planning, others present) */}
        {isOwner && planning && members.length > 1 && (
          <Button variant="soft" className="w-full" onClick={poke} disabled={poked}>
            <Hand size={16} /> {poked ? "Poked everyone" : "Poke people to weigh in"}
          </Button>
        )}

        {!isOwner ? (
          <p className="rounded-xl border-2 border-ink/10 bg-surface-2/50 px-4 py-3 text-center text-sm font-bold text-muted">
            {phase === "locked" ? "Locked in by the owner." : "Vote and add ideas — the owner locks it in."}
          </p>
        ) : phase === "open" ? (
          <>
            <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={() => move("locked")}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />} Lock it in
            </Button>
            <p className="text-center text-xs text-muted">
              {allDecided
                ? "Everyone's agreed? Lock it in — it goes in calendars. You can still tweak after."
                : `Pick an option for each step (${decidedCount}/${slots.length}), then lock it in.`}
            </p>
          </>
        ) : (
          <>
            <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={() => move("completed")}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Mark as done — get your Adventure card
            </Button>
            <button onClick={() => move("open")} disabled={busy} className="text-center text-sm font-bold text-muted underline">
              Back to planning
            </button>
          </>
        )}

        {/* delete (owner only) */}
        {isOwner && (confirmDelete ? (
          <div className="rounded-xl border-2 border-ink bg-surface p-4 text-center shadow-hard">
            <p className="text-sm font-bold">Delete this plan for good? This can&apos;t be undone.</p>
            <div className="mt-3 flex gap-3">
              <Button variant="soft" className="flex-1" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep it</Button>
              <button
                onClick={doDelete}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-ink bg-[#c0392b] px-6 text-[15px] font-bold text-white shadow-hard disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="mx-auto inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-[#c0392b]">
            <Trash2 size={14} /> Delete plan
          </button>
        ))}
      </section>

      <p className="mt-6 text-center text-xs text-muted">No app needed — anyone with this link can join.</p>

      {/* invite sheet */}
      {inviteOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setInviteOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md p-4">
            <div className="rounded-xl border-2 border-ink bg-surface p-4 shadow-hard">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg font-bold">Invite people</span>
                <button onClick={() => setInviteOpen(false)} className="text-muted"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {friends.map((f) => {
                  const on = pickedFriends.includes(f.id);
                  return (
                    <button key={f.id} onClick={() => setPickedFriends((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))} className="flex min-w-0 flex-col items-center gap-1">
                      <span className={on ? "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}>
                        <Avatar name={f.name} src={f.avatar} size={48} />
                      </span>
                      <span className="w-full truncate text-center text-xs font-bold">{f.name}</span>
                    </button>
                  );
                })}
              </div>
              <Button variant="primary" className="mt-4 w-full" disabled={!pickedFriends.length} onClick={doInvite}>
                Invite {pickedFriends.length || ""}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* slot wrapper: numbered header + decided badge + time */
function SlotShell({
  slot, index, decided, time, children,
}: {
  slot: Slot; index: number; decided?: boolean; time?: string | null; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-primary text-xs font-bold leading-none text-white">
          {index + 1}
        </span>
        <span className="font-heading text-base font-bold">{slot.label}</span>
        {time && <span className="inline-flex items-center gap-1 text-xs font-bold text-muted"><Clock size={11} /> {time}</span>}
        {decided ? (
          <Pill tone="success" className="ml-auto"><Check size={12} /> Set</Pill>
        ) : (
          <span className="ml-auto text-xs font-bold text-muted">Vote · pick one</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* compact time picker chip */
function TimeChip({ value, onChange }: { value: string | null; onChange: (t: string | null) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-md border-2 border-line px-2.5 py-1 text-sm font-bold text-ink hover:border-primary">
        <Clock size={13} className="text-primary" /> {value ?? "Set time"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-1 w-56 rounded-xl border-2 border-ink bg-surface p-2 shadow-hard">
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => (
                <button key={t} onClick={() => { onChange(t); setOpen(false); }}
                  className={`rounded-md border-2 px-2 py-1 text-xs font-bold ${value === t ? "border-ink bg-secondary text-white" : "border-line text-ink hover:border-secondary"}`}>
                  {t}
                </button>
              ))}
            </div>
            {value && (
              <button onClick={() => { onChange(null); setOpen(false); }} className="mt-2 w-full text-xs font-bold text-muted underline">Clear</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* one-shot feedback box that re-rolls a whole plan or day. Holds its own text
   state so typing here never re-renders the parent PlanView (the old lag cause). */
function GeneralFeedback({
  busy, onSubmit, placeholder,
}: {
  busy: boolean; onSubmit: (value: string) => void; placeholder: string;
}) {
  const [text, setText] = React.useState("");
  const submit = () => { onSubmit(text); setText(""); };
  return (
    <div className="mb-3 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-md border-2 border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-secondary"
      />
      <Button variant="secondary" disabled={busy} onClick={submit}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
      </Button>
    </div>
  );
}

/* add-a-step input — self-stating leaf so typing doesn't re-render the plan */
function AddStepBox({ onAdd }: { onAdd: (label: string) => void }) {
  const [text, setText] = React.useState("");
  const add = () => { const t = text.trim(); if (!t) return; onAdd(t); setText(""); };
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="Add a step — e.g. Dessert, Nightcap…"
        aria-label="Add a step"
        className="w-full rounded-md border-2 border-dashed border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-primary"
      />
      <Button variant="soft" disabled={!text.trim()} onClick={add}>
        <Plus size={16} />
      </Button>
    </div>
  );
}

/* one slot's card stack — memoized module-scope component with local expand +
   refine-text state. Lives outside PlanView so React can bail re-renders. */
const PlanSlot = React.memo(function PlanSlot({
  slot, index, isOwner, planning, working, votes, voted, placeArea,
  onVote, onChoose, onDeleteOpt, onRefine, onAddOwn, onResolveAdd, onSetSlotTime,
}: {
  slot: Slot; index: number; isOwner: boolean; planning: boolean; working: string | null;
  votes: Record<string, number>; voted: Record<string, boolean>; placeArea: string | null;
  onVote: (id: string) => void; onChoose: (slotId: string, id: string) => void; onDeleteOpt: (id: string) => void;
  onRefine: (slotKey: string, day: number, feedback: string, append?: boolean) => void;
  onAddOwn: (slotKey: string, day: number, title: string, area?: string) => void;
  onResolveAdd: (slotKey: string, day: number, query: string) => void;
  onSetSlotTime: (slotKey: string, day: number, time: string | null) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const decided = !!slot.chosen;
  const empty = slot.options.length === 0;
  const refining = working === `${slot.id}:refine`;
  const pick = (id: string) => { setExpanded(false); onChoose(slot.id, id); };

  if (slot.fixed && slot.options[0]) {
    const o = slot.options[0];
    return (
      <SlotShell slot={slot} index={index} decided>
        <OptionCard title={o.title} subtitle={o.subtitle} why={o.why} sourceUrl={o.source_url} sourceLabel="Set" selected />
      </SlotShell>
    );
  }

  if (decided && !expanded) {
    const o = slot.chosen!;
    return (
      <SlotShell slot={slot} index={index} decided time={chosenTime(slot)}>
        <OptionCard title={o.title} subtitle={o.subtitle} why={o.why} sourceUrl={o.source_url} sourceLabel={o.source_label} selected />
        {isOwner && planning && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button onClick={() => setExpanded(true)} className="text-sm font-bold text-muted underline">
              Change pick
            </button>
            <TimeChip value={chosenTime(slot)} onChange={(t) => onSetSlotTime(slot.key, slot.day, t)} />
          </div>
        )}
      </SlotShell>
    );
  }

  return (
    <SlotShell slot={slot} index={index} decided={decided}>
      {empty ? (
        <div className="rounded-xl border-2 border-dashed border-line bg-surface-2/40 p-4 text-center">
          <p className="text-sm font-bold text-muted">Nothing here yet.</p>
          {isOwner && planning && (
            <Button variant="secondary" size="sm" className="mt-3" disabled={refining} onClick={() => onRefine(slot.key, slot.day, "")}>
              {refining ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} Suggest with AI
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {slot.options.map((o) => (
            <OptionCard
              key={o.id}
              title={o.title} subtitle={o.subtitle} why={o.why}
              sourceUrl={o.source_url} sourceLabel={o.source_label}
              votes={votes[o.id]} voted={voted[o.id]} onVote={() => onVote(o.id)}
              selected={slot.chosen?.id === o.id}
              onSelect={isOwner && planning ? () => pick(o.id) : undefined}
              onDelete={isOwner && planning ? () => onDeleteOpt(o.id) : undefined}
            />
          ))}
        </div>
      )}

      {planning && (
        <SlotAddMenu
          slot={slot} isOwner={isOwner} empty={empty} placeArea={placeArea} refining={refining}
          onAddOwn={onAddOwn} onResolveAdd={onResolveAdd} onRefine={onRefine}
        />
      )}
    </SlotShell>
  );
});

/* One consolidated "+ Add to this step" control: search a place, ask AI to find a
   specific venue, or ask AI for ideas (which ADD to the step). Re-roll is separate. */
function SlotAddMenu({
  slot, isOwner, empty, placeArea, refining, onAddOwn, onResolveAdd, onRefine,
}: {
  slot: Slot; isOwner: boolean; empty: boolean; placeArea: string | null; refining: boolean;
  onAddOwn: (slotKey: string, day: number, title: string, area?: string) => void;
  onResolveAdd: (slotKey: string, day: number, query: string) => void;
  onRefine: (slotKey: string, day: number, feedback: string, append?: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border-2 border-dashed border-line px-3 py-2 text-sm font-bold text-primary transition hover:border-primary"
      >
        <Plus size={15} /> Add to this step
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-xl border-2 border-line bg-surface-2/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Add to this step</span>
        <button onClick={() => setOpen(false)} className="text-muted" aria-label="Close"><X size={16} /></button>
      </div>
      <PlaceSearch
        area={placeArea}
        onPick={(title, area) => onAddOwn(slot.key, slot.day, title, area)}
        onAiFind={(q) => onResolveAdd(slot.key, slot.day, q)}
      />
      {isOwner && (
        <SlotAskAi refining={refining} onAsk={(text) => onRefine(slot.key, slot.day, text, true)} />
      )}
      {isOwner && !empty && (
        <button
          onClick={() => onRefine(slot.key, slot.day, "", false)}
          disabled={refining}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-muted underline hover:text-ink disabled:opacity-60"
        >
          <RotateCw size={11} /> Replace all with fresh ideas
        </button>
      )}
    </div>
  );
}

/* self-stating "ask AI for ideas" input (adds to the step) */
function SlotAskAi({ refining, onAsk }: { refining: boolean; onAsk: (text: string) => void }) {
  const [text, setText] = React.useState("");
  const ask = () => { onAsk(text); setText(""); };
  return (
    <div className="mt-2 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ask()}
        placeholder="Ask AI for ideas — adds to this step…"
        aria-label="Ask AI for more ideas"
        className="w-full rounded-md border-2 border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-secondary"
      />
      <Button variant="secondary" disabled={refining} onClick={ask}>
        {refining ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
      </Button>
    </div>
  );
}

/* recurrence control — weekly / fortnightly / monthly */
const CADENCES: { id: PlanRecurrence["cadence"]; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Fortnightly" },
  { id: "monthly", label: "Monthly" },
];
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function RecurringControl({
  recurrence, defaultStart, onChange,
}: {
  recurrence: PlanRecurrence | null; defaultStart?: string | null; onChange: (r: PlanRecurrence | null) => void;
}) {
  const base = defaultStart ? new Date(defaultStart) : new Date();
  const time = defaultStart ? base.toTimeString().slice(0, 5) : (recurrence?.time ?? null);
  function build(cadence: PlanRecurrence["cadence"]): PlanRecurrence {
    return {
      cadence,
      weekday: recurrence?.weekday ?? base.getDay(),
      monthday: recurrence?.monthday ?? base.getDate(),
      time: recurrence?.time ?? time,
      anchor: recurrence?.anchor ?? base.toISOString().slice(0, 10),
    };
  }
  const summary = recurrence
    ? recurrence.cadence === "monthly"
      ? `Repeats monthly on the ${ordinal(recurrence.monthday ?? base.getDate())}`
      : `Repeats ${recurrence.cadence === "biweekly" ? "every two weeks" : "weekly"} on ${WEEKDAYS[recurrence.weekday]}`
    : null;
  return (
    <Section icon={<Repeat size={15} />} label="Recurring" tone="secondary">
      <p className="mb-3 text-sm text-muted">
        {summary
          ? `${summary}. Becomes real repeats when you lock in — each one independent.`
          : "Make this a regular thing (e.g. climbing every week). Repeats are created when you lock in; people confirm each one."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {CADENCES.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange(build(c.id))}
            className={`rounded-md border-2 px-3 py-1.5 text-sm font-bold transition ${recurrence?.cadence === c.id ? "border-ink bg-secondary text-white" : "border-line text-ink hover:border-secondary"}`}
          >
            {c.label}
          </button>
        ))}
        {recurrence && (
          <Button variant="soft" size="sm" className="ml-auto shrink-0 whitespace-nowrap" onClick={() => onChange(null)}>Turn off</Button>
        )}
      </div>
    </Section>
  );
}
