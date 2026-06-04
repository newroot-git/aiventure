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
import type { Plan, PlanOption, PlanMember, RSVP, Profile } from "@/lib/types";
import type { PlanScaffoldSlot, PlanRecurrence } from "@/lib/db";

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
}: {
  plan: Plan;
  options: PlanOption[];
  members: PlanMember[];
  friends?: Profile[];
  scaffold?: PlanScaffoldSlot[];
  recurrence?: PlanRecurrence | null;
}) {
  const slots = React.useMemo(() => buildSlots(options, scaffold), [options, scaffold]);
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

  const [rsvp, setRsvp] = React.useState<RSVP>("in");
  const [votes, setVotes] = React.useState<Record<string, number>>(
    Object.fromEntries(options.map((o) => [o.id, o.votes])),
  );
  const [voted, setVoted] = React.useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [refineText, setRefineText] = React.useState<Record<string, string>>({});
  const [addText, setAddText] = React.useState<Record<string, string>>({});
  const [allFeedback, setAllFeedback] = React.useState<Record<number, string>>({}); // keyed by day (0 = whole plan)
  const [working, setWorking] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [pickedFriends, setPickedFriends] = React.useState<string[]>([]);
  const [newSlot, setNewSlot] = React.useState<Record<number, string>>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const router = useRouter();

  const phase = plan.status;
  const planning = phase === "open";
  const people = members.map((m) => m.profile ?? { name: "Guest" });
  const generalArea = plan.place_address || plan.place_name || "TBC";

  async function persist(body: Record<string, unknown>) {
    await fetch("/api/plans/edit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: plan.slug, ...body }),
    });
    router.refresh();
  }
  function choose(slotId: string, id: string) {
    setExpanded((e) => ({ ...e, [slotId]: false }));
    persist({ action: "choose", optionId: id });
  }
  const setWhenDate = (iso: string) => persist({ action: "when", startsAt: iso });
  async function doInvite() {
    if (!pickedFriends.length) return;
    await persist({ action: "invite", profileIds: pickedFriends });
    setInviteOpen(false);
    setPickedFriends([]);
  }
  async function move(status: "open" | "locked" | "completed") {
    setBusy(true);
    try {
      await fetch("/api/plans/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, status }),
      });
      router.refresh();
    } finally { setBusy(false); }
  }
  function vote(id: string) {
    setVoted((v) => {
      const now = !v[id];
      setVotes((vs) => ({ ...vs, [id]: (vs[id] ?? 0) + (now ? 1 : -1) }));
      return { ...v, [id]: now };
    });
  }
  async function refine(slot: Slot, feedback: string) {
    const key = `${slot.id}:refine`;
    setWorking(key);
    try {
      await fetch("/api/plans/refine", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, slotKey: slot.key, day: slot.day, feedback }),
      });
      setRefineText((t) => ({ ...t, [slot.id]: "" }));
      router.refresh();
    } finally { setWorking(null); }
  }
  async function refineAll(day: number | undefined, feedback: string) {
    const key = `all:${day ?? 0}`;
    setWorking(key);
    try {
      await fetch("/api/plans/refine", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, all: true, day, feedback }),
      });
      setAllFeedback((t) => ({ ...t, [day ?? 0]: "" }));
      router.refresh();
    } finally { setWorking(null); }
  }
  async function addOwn(slot: Slot) {
    const q = (addText[slot.id] ?? "").trim();
    if (!q) return;
    const key = `${slot.id}:add`;
    setWorking(key);
    try {
      await fetch("/api/plans/add-option", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug, query: q, slotKey: slot.key, day: slot.day }),
      });
      setAddText((t) => ({ ...t, [slot.id]: "" }));
      router.refresh();
    } finally { setWorking(null); }
  }
  async function addStep(day: number) {
    const label = (newSlot[day] ?? "").trim();
    if (!label) return;
    setNewSlot((t) => ({ ...t, [day]: "" }));
    await persist({ action: "addSlot", label, day });
  }
  const setSlotTime = (slot: Slot, time: string | null) =>
    persist({ action: "slotTime", slotKey: slot.key, day: slot.day, time });
  async function toggleRecurring(next: PlanRecurrence | null) {
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

  if (phase === "completed") {
    return (
      <div className="mx-auto w-full max-w-lg px-5 py-12">
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

  /* one slot's card stack */
  function SlotBlock({ slot, index }: { slot: Slot; index: number }) {
    const isExpanded = expanded[slot.id];
    const decided = !!slot.chosen;
    const empty = slot.options.length === 0;

    if (slot.fixed && slot.options[0]) {
      const o = slot.options[0];
      return (
        <SlotShell slot={slot} index={index} decided>
          <OptionCard title={o.title} subtitle={o.subtitle} why={o.why} sourceUrl={o.source_url} sourceLabel="Set" selected />
        </SlotShell>
      );
    }

    if (decided && !isExpanded) {
      const o = slot.chosen!;
      return (
        <SlotShell slot={slot} index={index} decided time={chosenTime(slot)}>
          <OptionCard title={o.title} subtitle={o.subtitle} why={o.why} sourceUrl={o.source_url} sourceLabel={o.source_label} selected />
          {planning && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button onClick={() => setExpanded((e) => ({ ...e, [slot.id]: true }))} className="text-sm font-bold text-muted underline">
                Change pick
              </button>
              <TimeChip value={chosenTime(slot)} onChange={(t) => setSlotTime(slot, t)} />
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
            {planning && (
              <Button variant="secondary" size="sm" className="mt-3" disabled={working === `${slot.id}:refine`} onClick={() => refine(slot, "")}>
                {working === `${slot.id}:refine` ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} Suggest with AI
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
                votes={votes[o.id]} voted={voted[o.id]} onVote={() => vote(o.id)}
                selected={slot.chosen?.id === o.id}
                onSelect={planning ? () => choose(slot.id, o.id) : undefined}
              />
            ))}
          </div>
        )}

        {planning && (
          <>
            <div className="mt-3 flex gap-2">
              <input
                value={addText[slot.id] ?? ""}
                onChange={(e) => setAddText((t) => ({ ...t, [slot.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addOwn(slot)}
                placeholder="Add your own — a place or business…"
                className="w-full rounded-md border-2 border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-primary"
              />
              <Button variant="soft" disabled={working === `${slot.id}:add` || !(addText[slot.id] ?? "").trim()} onClick={() => addOwn(slot)}>
                {working === `${slot.id}:add` ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              </Button>
            </div>
            {!empty && (
              <div className="mt-2 flex gap-2">
                <input
                  value={refineText[slot.id] ?? ""}
                  onChange={(e) => setRefineText((t) => ({ ...t, [slot.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && refine(slot, refineText[slot.id] ?? "")}
                  placeholder="Ask AI for different ideas — e.g. more chill, cheaper…"
                  className="w-full rounded-md border-2 border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-primary"
                />
                <Button variant="secondary" disabled={working === `${slot.id}:refine`} onClick={() => refine(slot, refineText[slot.id] ?? "")}>
                  {working === `${slot.id}:refine` ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                </Button>
              </div>
            )}
          </>
        )}
      </SlotShell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
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
          {recurrence && (
            <Pill tone="secondary" className="border-2 border-ink/10"><Repeat size={13} /> Weekly</Pill>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10">
          <h1 className="font-heading text-2xl font-extrabold leading-tight text-white drop-shadow">
            {plan.activity ?? plan.title}
          </h1>
        </div>
      </div>

      {/* when / where */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Section icon={<Clock size={15} />} label={recurrence ? "Repeats" : "When"} tone="accent">
          {recurrence ? (
            <div className="font-bold leading-tight">Every {WEEKDAYS[recurrence.weekday]}{recurrence.time ? ` · ${recurrence.time}` : ""}</div>
          ) : (
            <>
              <div className="font-bold leading-tight">{fmtDate(plan.starts_at) ?? "Pick a time"}</div>
              {fmtTime(plan.starts_at) && <div className="text-sm text-muted">{fmtTime(plan.starts_at)}</div>}
              <WhenPicker value={plan.starts_at} onChange={setWhenDate} />
            </>
          )}
        </Section>
        <Section icon={<MapPin size={15} />} label={multiStep ? "Area" : "Where"} tone="primary">
          <div className="font-bold leading-tight">{multiStep ? generalArea : (plan.place_name ?? "TBC")}</div>
          {multiStep
            ? <div className="text-sm text-muted">{pins.length} stop{pins.length === 1 ? "" : "s"}</div>
            : plan.place_address && <div className="text-sm text-muted">{plan.place_address}</div>}
        </Section>
      </div>

      {/* multi-pin map for itineraries */}
      {pins.length >= 1 && <div className="mt-3"><PlanMap pins={pins} area={plan.place_address} /></div>}

      {/* who */}
      <div className="mt-4">
        <Section icon={<Users size={15} />} label="Who's in" tone="success">
          <div className="mb-3 flex items-center justify-between">
            <AvatarStack people={people} />
            <span className="text-sm font-bold text-muted">
              {members.filter((m) => m.rsvp === "in").length} {recurrence ? "in this week" : "going"}
            </span>
          </div>
          <RSVPControl value={rsvp} onChange={setRsvp} />
          {friends.length > 0 && (
            <button onClick={() => setInviteOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
              <UserPlus size={15} /> Invite people
            </button>
          )}
        </Section>
      </div>

      {/* recurring control */}
      {planning && (
        <div className="mt-4">
          <RecurringControl recurrence={recurrence} defaultStart={plan.starts_at} onChange={toggleRecurring} />
        </div>
      )}

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
          {planning && multiStep && !multiDay && (
            <GeneralFeedback
              value={allFeedback[0] ?? ""}
              busy={working === "all:0"}
              onChange={(v) => setAllFeedback((t) => ({ ...t, [0]: v }))}
              onSubmit={() => refineAll(undefined, allFeedback[0] ?? "")}
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
                {planning && multiDay && (
                  <GeneralFeedback
                    value={allFeedback[d] ?? ""}
                    busy={working === `all:${d}`}
                    onChange={(v) => setAllFeedback((t) => ({ ...t, [d]: v }))}
                    onSubmit={() => refineAll(d, allFeedback[d] ?? "")}
                    placeholder={`Tweak all of day ${d} at once…`}
                  />
                )}
                <div className="mt-2 flex flex-col gap-5">
                  {slots.filter((s) => s.day === d).map((s) => {
                    const i = idx++;
                    return (
                      <Reveal key={s.id} delay={Math.min(i, 5) * 0.05}>
                        <SlotBlock slot={s} index={i} />
                      </Reveal>
                    );
                  })}
                </div>
                {planning && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newSlot[d] ?? ""}
                      onChange={(e) => setNewSlot((t) => ({ ...t, [d]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addStep(d)}
                      placeholder="Add a step — e.g. Dessert, Nightcap…"
                      className="w-full rounded-md border-2 border-dashed border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-primary"
                    />
                    <Button variant="soft" disabled={!(newSlot[d] ?? "").trim()} onClick={() => addStep(d)}>
                      <Plus size={16} />
                    </Button>
                  </div>
                )}
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

        {phase === "open" ? (
          <>
            <Button variant="primary" disabled={busy} onClick={() => move("locked")}>
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
            <Button variant="primary" disabled={busy} onClick={() => move("completed")}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Mark as done — get your Adventure card
            </Button>
            <button onClick={() => move("open")} disabled={busy} className="text-center text-sm font-bold text-muted underline">
              Back to planning
            </button>
          </>
        )}

        {/* delete */}
        {confirmDelete ? (
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
        )}
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
                    <button key={f.id} onClick={() => setPickedFriends((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))} className="flex flex-col items-center gap-1">
                      <span className={on ? "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}>
                        <Avatar name={f.name} src={f.avatar} size={48} />
                      </span>
                      <span className="truncate text-xs font-bold">{f.name}</span>
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

/* one-shot feedback box that re-rolls a whole plan or day */
function GeneralFeedback({
  value, busy, onChange, onSubmit, placeholder,
}: {
  value: string; busy: boolean; onChange: (v: string) => void; onSubmit: () => void; placeholder: string;
}) {
  return (
    <div className="mb-3 flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder={placeholder}
        className="w-full rounded-md border-2 border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-secondary"
      />
      <Button variant="secondary" disabled={busy} onClick={onSubmit}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
      </Button>
    </div>
  );
}

/* weekly recurrence control */
function RecurringControl({
  recurrence, defaultStart, onChange,
}: {
  recurrence: PlanRecurrence | null; defaultStart?: string | null; onChange: (r: PlanRecurrence | null) => void;
}) {
  const startWeekday = defaultStart ? new Date(defaultStart).getDay() : new Date().getDay();
  return (
    <Section icon={<Repeat size={15} />} label="Recurring" tone="secondary">
      {recurrence ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">Repeats every {WEEKDAYS[recurrence.weekday]}</div>
            <p className="text-sm text-muted">Shows weekly — people confirm each time.</p>
          </div>
          <Button variant="soft" size="sm" onClick={() => onChange(null)}>Turn off</Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Make this a weekly thing (e.g. climbing every week).</p>
          <Button variant="secondary" size="sm" onClick={() => onChange({ cadence: "weekly", weekday: startWeekday, time: defaultStart ? new Date(defaultStart).toTimeString().slice(0, 5) : null })}>
            <Repeat size={14} /> Make weekly
          </Button>
        </div>
      )}
    </Section>
  );
}
