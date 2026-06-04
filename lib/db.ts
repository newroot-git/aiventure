import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";
import { generateDrop, generateSlotOptions, mapsUrl, type DropInput, type DropSlot } from "./ai";
import { planSlug } from "./slug";
import type { Plan, PlanOption, PlanMember, Profile, RSVP, Visibility } from "./types";

// Demo identity (stands in for auth) — the seeded "Josh" profile.
export const DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";

// Map a Supabase auth user → our profile id (link by auth_id, then email, else create).
async function resolveAuthProfile(authId: string, email: string | null): Promise<string> {
  const db = supabaseAdmin();
  const { data: byAuth } = await db.from("profiles").select("id").eq("auth_id", authId).maybeSingle();
  if (byAuth) return (byAuth as Row).id as string;
  if (email) {
    const { data: byEmail } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    if (byEmail) {
      await db.from("profiles").update({ auth_id: authId } as never).eq("id", (byEmail as Row).id as string);
      return (byEmail as Row).id as string;
    }
  }
  const name = email ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Adventurer";
  const { data: created } = await db.from("profiles")
    .insert({ auth_id: authId, email, name, interests: [] } as never).select("id").single();
  return (created as unknown as Row).id as string;
}

/**
 * Current acting user, resolved once per request:
 *  1. a real Supabase auth session  → linked/created profile
 *  2. the `av_uid` cookie            → guest ("I'm a judge") or dev switcher
 *  3. otherwise ""                   → anonymous (read-only; mutations will no-op/fail)
 * This is the single identity seam — every caller routes through it.
 */
export const currentUserId = cache(async (): Promise<string> => {
  try {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (user) return await resolveAuthProfile(user.id, user.email ?? null);
  } catch {}
  try {
    const c = await cookies();
    const uid = c.get("av_uid")?.value;
    if (uid) return uid;
  } catch {}
  return "";
});

/** True if the acting user owns (created) the plan. */
export async function isPlanOwner(slug: string): Promise<boolean> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data } = await db.from("plans").select("creator_id").eq("slug", slug).maybeSingle();
  return !!data && (data as Row).creator_id === me;
}

// activity categories that have a dedicated lush cover image
const COVER_CATS = new Set([
  "hike", "walk", "climb", "cycle", "run", "surf", "swim", "kayak", "ski",
  "golf", "tennis", "football", "yoga", "camp", "beach", "stargazing", "fishing",
  "pub", "bar", "cocktails", "wine", "coffee", "brunch", "food", "roast", "bbq", "market", "streetfood",
  "gig", "festival", "cinema", "theatre", "comedy", "gallery", "museum", "music",
  "games", "arcade", "bowling", "karaoke",
  "park", "city", "trip", "spa", "dance",
]);
// cover_hue stores a tile/category key for AI plans → map to its cover image
function deriveCover(hue?: string | null): string | null {
  if (!hue) return null;
  return COVER_CATS.has(hue) ? `/img/cover-${hue}.png` : "/img/cover-park.png";
}

// A plan carries one meta row (kind='time', title='__meta') holding the slot
// scaffold (so empty slots persist) + any recurrence config. No DDL needed.
const META_TITLE = "__meta";
interface ScaffoldSlot { key: string; label: string; day: number; order: number; fixed?: boolean }
interface Recurrence { cadence: "weekly" | "biweekly" | "monthly"; weekday: number; monthday?: number; time?: string | null; anchor?: string }
interface PlanMeta { scaffold: ScaffoldSlot[]; recurrence: Recurrence | null; seriesId?: string | null; materialized?: boolean }

// default empty skeleton when the user builds it themselves (no AI)
function defaultScaffold(scope: DropInput["scope"], nights = 2): ScaffoldSlot[] {
  if (scope === "adventure") {
    return [
      { key: "food", label: "Food", day: 1, order: 0 },
      { key: "main", label: "Main thing", day: 1, order: 1 },
      { key: "after", label: "After", day: 1, order: 2 },
    ];
  }
  if (scope === "trip") {
    const out: ScaffoldSlot[] = [];
    for (let d = 1; d <= Math.max(1, nights + 1); d++) {
      ["Morning", "Lunch", "Afternoon", "Evening"].forEach((label, i) =>
        out.push({ key: `${label.toLowerCase()}-${d}`, label, day: d, order: i }),
      );
    }
    return out;
  }
  return [{ key: "plan", label: "The plan", day: 1, order: 0 }];
}

function scaffoldFromSlots(slots: DropSlot[]): ScaffoldSlot[] {
  return slots.map((s, i) => ({ key: s.key, label: s.label, day: s.day ?? 1, order: i, fixed: !!s.fixed }));
}

async function writeMeta(planId: string, patch: Partial<PlanMeta>): Promise<void> {
  const db = supabaseAdmin();
  const { data: rows } = await db.from("plan_options").select("id, payload").eq("plan_id", planId).eq("title", META_TITLE);
  const existing = (rows as Row[])?.[0];
  const cur = (existing?.payload as Row)?.meta as PlanMeta | undefined;
  const next: PlanMeta = {
    scaffold: patch.scaffold ?? cur?.scaffold ?? [],
    recurrence: patch.recurrence !== undefined ? patch.recurrence : (cur?.recurrence ?? null),
    seriesId: patch.seriesId !== undefined ? patch.seriesId : (cur?.seriesId ?? null),
    materialized: patch.materialized !== undefined ? patch.materialized : (cur?.materialized ?? false),
  };
  if (existing) {
    await db.from("plan_options").update({ payload: { meta: next } } as never).eq("id", existing.id as string);
  } else {
    await db.from("plan_options").insert({
      plan_id: planId, kind: "time", source: "ai", title: META_TITLE, payload: { meta: next },
    } as never);
  }
}

function readMeta(options: Row[]): PlanMeta {
  const row = options.find((o) => (o.title as string) === META_TITLE);
  const m = (row?.payload as Row)?.meta as PlanMeta | undefined;
  return { scaffold: m?.scaffold ?? [], recurrence: m?.recurrence ?? null, seriesId: m?.seriesId ?? null, materialized: !!m?.materialized };
}

export interface CreateExtras {
  visibility?: Visibility;
  groupId?: string | null;
  startsAt?: string | null;
  dateOptions?: string[];
  budget?: string | null;
}

/** Create a plan. aiBuild=true → AI fills slots; false → empty named skeleton. */
export async function createPlanFromDrop(input: DropInput & CreateExtras): Promise<{ slug: string }> {
  const aiBuild = !!input.aiBuild;
  let title = input.intent.slice(0, 140);
  let slots: DropSlot[] = [];
  // the area refines/per-slot AI will use — the AI's resolved area beats the
  // (possibly default "London") form value, so a HK plan stays HK throughout.
  let area = input.location ?? null;
  if (aiBuild) {
    const drop = await generateDrop(input);
    slots = drop.slots ?? [];
    if (drop.title) title = drop.title;
    if (drop.area) area = drop.area;
  }
  const scaffold = aiBuild ? scaffoldFromSlots(slots) : defaultScaffold(input.scope, input.nights);
  const slug = planSlug(`${Date.now()}-${input.intent}`);
  const db = supabaseAdmin();
  const me = await currentUserId();

  const firstTile = slots[0]?.options[0]?.tile ?? "city";
  const { data: plan, error } = await db
    .from("plans")
    .insert({
      slug,
      title,
      intent: input.intent,
      status: "open",
      visibility: input.visibility ?? "invite",
      creator_id: me,
      group_id: input.groupId ?? null,
      ai_empowered: true,
      cover_hue: firstTile,
      starts_at: input.startsAt ?? null,
      place_address: area, // the resolved area — keeps later refines in the right place
    } as never)
    .select("id")
    .single();
  if (error || !plan) throw new Error(error?.message ?? "insert plan failed");

  const planId = (plan as { id: string }).id;
  const rows = flattenSlots(planId, slots);
  // candidate dates (the "a few options" path)
  (input.dateOptions ?? []).forEach((iso) =>
    rows.push({ plan_id: planId, kind: "time", source: "human", title: "date", payload: { date_option: true, iso } }),
  );
  if (rows.length) {
    const { error: e2 } = await db.from("plan_options").insert(rows as never);
    if (e2) throw new Error(e2.message);
  }
  await writeMeta(planId, { scaffold });

  // members: creator always; whole group if a group was chosen
  const memberRows: Record<string, unknown>[] = [{ plan_id: planId, profile_id: me, rsvp: "in", joined_via: "app" }];
  if (input.groupId) {
    const { data: gm } = await db.from("group_members").select("profile_id").eq("group_id", input.groupId);
    for (const g of (gm as Row[]) ?? []) {
      const pid = g.profile_id as string;
      if (pid !== me) memberRows.push({ plan_id: planId, profile_id: pid, rsvp: "in", joined_via: "app" });
    }
  }
  await db.from("plan_members").upsert(memberRows as never, { onConflict: "plan_id,profile_id" } as never);
  return { slug };
}

// flatten ordered slots → plan_options rows, stamping slot metadata into payload
function flattenSlots(planId: string, slots: DropSlot[]) {
  const rows: Record<string, unknown>[] = [];
  slots.forEach((s, si) => {
    s.options.forEach((o) => {
      rows.push({
        plan_id: planId,
        kind: "activity",
        source: "ai",
        title: o.title,
        subtitle: o.subtitle ?? null,
        why: o.why ?? null,
        source_url: mapsUrl(o.map_query) ?? null,
        source_label: "AI + Maps",
        payload: {
          slot: s.key,
          slot_label: s.label,
          slot_order: si,
          day: s.day ?? 1,
          fixed: !!s.fixed,
          chosen: false,
          tile: o.tile,
          place_name: o.place_name ?? null,
          time: o.time ?? null,
        },
      });
    });
  });
  return rows;
}

export interface PlanScaffoldSlot { key: string; label: string; day: number; order: number; fixed?: boolean }
export interface PlanRecurrence { cadence: "weekly" | "biweekly" | "monthly"; weekday: number; monthday?: number; time?: string | null; anchor?: string }
export interface DateOption { id: string; iso: string; votes: number; mine: boolean }

/** Load a persisted plan + its options + members + meta by slug (null if not found). */
export async function getPlanBySlug(slug: string): Promise<{
  plan: Plan;
  options: PlanOption[];
  members: PlanMember[];
  scaffold: PlanScaffoldSlot[];
  recurrence: PlanRecurrence | null;
  dateOptions: DateOption[];
  myRsvp: RSVP | null;
  currentUserId: string;
  isOwner: boolean;
} | null> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: plan } = await db.from("plans").select("*").eq("slug", slug).maybeSingle();
  if (!plan) return null;

  const row = plan as Record<string, unknown>;
  const { data: rawOptions } = await db
    .from("plan_options")
    .select("*")
    .eq("plan_id", row.id as string)
    .order("created_at");
  const { data: members } = await db
    .from("plan_members")
    .select("*, profile:profiles(*)")
    .eq("plan_id", row.id as string);

  const allOpts = (rawOptions ?? []) as Row[];
  const meta = readMeta(allOpts);
  const nonMeta = allOpts.filter((o) => (o.title as string) !== META_TITLE);
  const dateRows = nonMeta.filter((o) => ((o.payload as Row) ?? {}).date_option);
  const optionRows = nonMeta.filter((o) => !((o.payload as Row) ?? {}).date_option);

  // vote tallies (one row per user per option) for every option + date candidate
  const ids = nonMeta.map((o) => o.id as string);
  const voteCount = new Map<string, number>();
  const mine = new Set<string>();
  if (ids.length) {
    const { data: votes } = await db.from("option_votes").select("option_id, profile_id").in("option_id", ids);
    for (const v of (votes as Row[]) ?? []) {
      const oid = v.option_id as string;
      voteCount.set(oid, (voteCount.get(oid) ?? 0) + 1);
      if ((v.profile_id as string) === me) mine.add(oid);
    }
  }

  const myMember = ((members ?? []) as Row[]).find((m) => (m.profile_id as string) === me);

  return {
    plan: {
      ...(row as unknown as Plan),
      key_info: (row.key_info as Plan["key_info"]) ?? [],
      cover_url: deriveCover(row.cover_hue as string | null),
    },
    options: optionRows.map((o) => ({
      ...o, votes: voteCount.get(o.id as string) ?? 0, mine: mine.has(o.id as string),
    })) as unknown as PlanOption[],
    members: ((members ?? []) as Record<string, unknown>[]).map((m) => ({
      ...m,
      profile: mapProfile(m.profile as Record<string, unknown>),
    })) as unknown as PlanMember[],
    scaffold: meta.scaffold,
    recurrence: meta.recurrence,
    dateOptions: dateRows
      .map((o) => ({
        id: o.id as string,
        iso: ((o.payload as Row)?.iso as string) ?? "",
        votes: voteCount.get(o.id as string) ?? 0,
        mine: mine.has(o.id as string),
      }))
      .sort((a, b) => a.iso.localeCompare(b.iso)),
    myRsvp: (myMember?.rsvp as RSVP) ?? null,
    currentUserId: me,
    isOwner: (row.creator_id as string) === me,
  };
}

// ---------- read helpers (map DB rows → app types) ----------
type Row = Record<string, unknown>;

function mapProfile(r: Row | null | undefined): Profile | null {
  if (!r) return null;
  return {
    id: r.id as string,
    auth_id: (r.auth_id as string) ?? null,
    name: r.name as string,
    email: (r.email as string) ?? null,
    avatar: (r.avatar_emoji as string) ?? null, // avatar path repurposed into avatar_emoji
    interests: (r.interests as string[]) ?? [],
    interest_notes: (r.interest_notes as string) ?? null,
    is_paid: (r.is_paid as boolean) ?? false,
    created_at: (r.created_at as string) ?? "",
  };
}

function fmtDateLabel(iso?: string | null): string {
  if (!iso) return "To be planned";
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const hasTime = iso.includes("T") && !iso.endsWith("00:00:00Z");
  return hasTime ? `${day} · ${time}` : day;
}

export interface PlanCard {
  id: string; slug: string; activity: string; dateLabel: string; date: string; startsAtISO: string; place: string;
  groupName: string; members: Profile[]; status: "upcoming" | "past"; adventureNo?: number;
  cover: string; tile: string; recurrence?: PlanRecurrence | null;
}

function mapPlanCard(r: Row): PlanCard {
  const members = ((r.plan_members as Row[]) ?? [])
    .map((m) => mapProfile(m.profile as Row))
    .filter((p): p is Profile => !!p);
  const hue = (r.cover_hue as string) || "city";
  return {
    id: r.id as string,
    slug: r.slug as string,
    activity: (r.activity as string) || (r.title as string),
    date: r.starts_at ? (r.starts_at as string).slice(0, 10) : "",
    startsAtISO: (r.starts_at as string) || "",
    dateLabel: fmtDateLabel(r.starts_at as string),
    place: (r.place_name as string) || "TBC",
    groupName: ((r.group as Row)?.name as string) || "You",
    members,
    status: r.completed_at ? "past" : "upcoming",
    adventureNo: (r.adventure_no as number) ?? undefined,
    cover: deriveCover(hue) || "/img/cover-hike.png",
    tile: hue,
  };
}

const PLAN_SELECT = "*, group:groups(name), plan_members(rsvp, profile:profiles(*))";

export async function getUserPlans(): Promise<PlanCard[]> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) return [];
  const { data: mem } = await db.from("plan_members").select("plan_id, rsvp").eq("profile_id", me);
  // plans I belong to, EXCLUDING ones I've declined ("can't") — those drop off my lists
  const ids = ((mem as Row[]) ?? []).filter((m) => (m.rsvp as string) !== "out").map((m) => m.plan_id as string);
  const declined = new Set(((mem as Row[]) ?? []).filter((m) => (m.rsvp as string) === "out").map((m) => m.plan_id as string));
  const orFilter = ids.length
    ? `creator_id.eq.${me},id.in.(${ids.join(",")})`
    : `creator_id.eq.${me}`;
  const { data } = await db.from("plans").select(PLAN_SELECT).or(orFilter).order("created_at", { ascending: false });
  // a plan I created but later declined still drops off (unless I'm the only one)
  const cards = ((data as Row[]) ?? []).filter((r) => !declined.has(r.id as string)).map(mapPlanCard);
  // attach recurrence from each plan's meta row
  const planIds = cards.map((c) => c.id);
  if (planIds.length) {
    const { data: metas } = await db.from("plan_options")
      .select("plan_id, payload").eq("title", META_TITLE).in("plan_id", planIds);
    const recByPlan = new Map<string, PlanRecurrence>();
    for (const m of (metas as Row[]) ?? []) {
      const rec = ((m.payload as Row)?.meta as PlanMeta | undefined)?.recurrence;
      if (rec) recByPlan.set(m.plan_id as string, rec as PlanRecurrence);
    }
    for (const c of cards) c.recurrence = recByPlan.get(c.id) ?? null;
  }
  return cards;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("*").eq("id", await currentUserId()).maybeSingle();
  return mapProfile(data as Row | null);
}

/** All seeded profiles — used by the dev profile switcher. */
export async function getAllProfiles(): Promise<Profile[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("*").order("created_at");
  return ((data as Row[]) ?? []).map((r) => mapProfile(r)).filter((p): p is Profile => !!p);
}

export async function getFriends(): Promise<{ profile: Profile; shared: string[] }[]> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) return [];
  const { data: profiles } = await db.from("profiles").select("*").neq("id", me);
  const groups = await getUserGroups();
  return ((profiles as Row[]) ?? [])
    .map((r) => mapProfile(r))
    .filter((p): p is Profile => !!p)
    .map((p) => ({ profile: p, shared: groups.filter((g) => g.members.some((m) => m.id === p.id)).map((g) => g.name) }));
}

export interface GroupCard { id: string; name: string; members: Profile[] }

export async function getUserGroups(): Promise<GroupCard[]> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) return [];
  const { data: gm } = await db.from("group_members").select("group_id").eq("profile_id", me);
  const ids = ((gm as Row[]) ?? []).map((g) => g.group_id as string);
  if (!ids.length) return [];
  const { data } = await db.from("groups").select("*, group_members(profile:profiles(*))").in("id", ids);
  return ((data as Row[]) ?? []).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    members: ((g.group_members as Row[]) ?? []).map((m) => mapProfile(m.profile as Row)).filter((p): p is Profile => !!p),
  }));
}

export async function getGroup(id: string): Promise<{ group: GroupCard; plans: PlanCard[] } | null> {
  const db = supabaseAdmin();
  const { data: g } = await db.from("groups").select("*, group_members(profile:profiles(*))").eq("id", id).maybeSingle();
  if (!g) return null;
  const gr = g as Row;
  const { data: plans } = await db.from("plans").select(PLAN_SELECT).eq("group_id", id).order("created_at", { ascending: false });
  return {
    group: {
      id: gr.id as string, name: gr.name as string,
      members: ((gr.group_members as Row[]) ?? []).map((m) => mapProfile(m.profile as Row)).filter((p): p is Profile => !!p),
    },
    plans: ((plans as Row[]) ?? []).map(mapPlanCard),
  };
}

// Resolve a slot's display meta (label/order) — scaffold is authoritative, then options.
function slotMetaFrom(scaffold: ScaffoldSlot[], optRows: Row[], slotKey: string, day: number): { label: string; order: number } {
  const sc = scaffold.find((s) => s.key === slotKey && s.day === day);
  if (sc) return { label: sc.label, order: sc.order };
  const op = optRows.find((o) => {
    const p = (o.payload as Row) ?? {};
    return p.slot === slotKey && ((p.day as number) ?? 1) === day;
  });
  const p = (op?.payload as Row) ?? {};
  return { label: (p.slot_label as string) || "Pick one", order: (p.slot_order as number) ?? 0 };
}

/** Regenerate the voteable options for ONE slot, optionally steered by feedback. */
export async function refineSlot(slug: string, slotKey: string, day: number, feedback?: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id, intent, place_address").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const row = plan as Row;
  const planId = row.id as string;
  const intent = (row.intent as string) || "something good";
  const location = (row.place_address as string) || "London, UK";

  const { data: existing } = await db.from("plan_options").select("*").eq("plan_id", planId);
  const allRows = (existing as Row[]) ?? [];
  const meta = readMeta(allRows);
  const { label, order } = slotMetaFrom(meta.scaffold, allRows, slotKey, day);
  const slotRows = allRows.filter((o) => {
    const p = (o.payload as Row) ?? {};
    return p.slot === slotKey && ((p.day as number) ?? 1) === day;
  });
  const fresh = await generateSlotOptions(label, `${intent} (the "${label}" step)`, location, feedback);
  if (!fresh.length) return;

  const ids = slotRows.map((o) => o.id as string);
  if (ids.length) await db.from("plan_options").delete().in("id", ids);
  const rows = fresh.map((o) => ({
    plan_id: planId, kind: "activity", source: "ai",
    title: o.title, subtitle: o.subtitle ?? null, why: o.why ?? null,
    source_url: mapsUrl(o.map_query) ?? null, source_label: "AI + Maps",
    payload: {
      slot: slotKey, slot_label: label, slot_order: order,
      day, fixed: false, chosen: false, tile: o.tile, place_name: o.place_name ?? null, time: o.time ?? null,
    },
  }));
  await db.from("plan_options").insert(rows as never);
  await deriveHeadline(planId, slug);
}

/** Regenerate EVERY slot's options from one feedback note (optionally just one day). */
export async function refineAll(slug: string, feedback?: string, day?: number): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const planId = (plan as Row).id as string;
  const { data: existing } = await db.from("plan_options").select("payload, title").eq("plan_id", planId);
  const allRows = (existing as Row[]) ?? [];
  const meta = readMeta(allRows);
  // unique (slot,day) targets — prefer scaffold, fall back to whatever options exist
  const seen = new Set<string>();
  const targets: { key: string; day: number }[] = [];
  const push = (key: string, d: number) => { const id = `${d}:${key}`; if (!seen.has(id)) { seen.add(id); targets.push({ key, day: d }); } };
  meta.scaffold.forEach((s) => push(s.key, s.day));
  allRows.forEach((o) => { const p = (o.payload as Row) ?? {}; if (p.slot) push(p.slot as string, (p.day as number) ?? 1); });
  const filtered = day ? targets.filter((t) => t.day === day) : targets;
  for (const t of filtered) {
    await refineSlot(slug, t.key, t.day, feedback);
  }
}

/** Set the time on a slot's chosen option (per-activity time). */
export async function setSlotTime(slug: string, slotKey: string, day: number, time: string | null): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const planId = (plan as Row).id as string;
  const { data: existing } = await db.from("plan_options").select("id, payload").eq("plan_id", planId);
  for (const o of (existing as Row[]) ?? []) {
    const p = (o.payload as Row) ?? {};
    if (p.slot === slotKey && ((p.day as number) ?? 1) === day && p.chosen) {
      await db.from("plan_options").update({ payload: { ...p, time } } as never).eq("id", o.id as string);
    }
  }
}

// ---------- participant actions: vote, RSVP, propose dates (no owner gate) ----------

/** Toggle the current user's vote on an option or date candidate. */
export async function toggleVote(optionId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: existing } = await db.from("option_votes")
    .select("option_id").eq("option_id", optionId).eq("profile_id", me).maybeSingle();
  if (existing) {
    await db.from("option_votes").delete().eq("option_id", optionId).eq("profile_id", me);
    return false;
  }
  await db.from("option_votes").insert({ option_id: optionId, profile_id: me } as never);
  return true;
}

/** Set the current user's RSVP (also joins them to the plan). */
export async function setRsvp(slug: string, rsvp: RSVP): Promise<void> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  await db.from("plan_members").upsert(
    { plan_id: (plan as Row).id as string, profile_id: me, rsvp, joined_via: "app" } as never,
    { onConflict: "plan_id,profile_id" } as never,
  );
  // declining clears the plan off your lists — also clear its invite + notifications
  if (rsvp === "out") {
    await db.from("invites").delete().eq("to_id", me).eq("plan_slug", slug);
    await db.from("notifications").update({ acknowledged: true } as never).eq("profile_id", me).eq("plan_slug", slug);
  }
}

/** Propose a candidate date/time for the group to vote availability on. */
export async function addDateOption(slug: string, iso: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  await db.from("plan_options").insert({
    plan_id: (plan as Row).id as string, kind: "time", source: "human", title: "date",
    payload: { date_option: true, iso },
  } as never);
}

/** Owner locks one candidate date as the plan's time (clears the candidates). */
export async function lockDate(slug: string, optionId: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: opt } = await db.from("plan_options").select("plan_id, payload").eq("id", optionId).maybeSingle();
  if (!opt) throw new Error("date option not found");
  const iso = ((opt as Row).payload as Row)?.iso as string;
  if (iso) await db.from("plans").update({ starts_at: iso } as never).eq("slug", slug);
  // remove all date candidates now that it's set
  await db.from("plan_options").delete().eq("plan_id", (opt as Row).plan_id as string).eq("title", "date");
}

/** Append a new (empty) slot to the plan's scaffold. */
export async function addSlot(slug: string, label: string, day = 1): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const planId = (plan as Row).id as string;
  const { data: existing } = await db.from("plan_options").select("payload, title").eq("plan_id", planId);
  const meta = readMeta((existing as Row[]) ?? []);
  const dayOrders = meta.scaffold.filter((s) => s.day === day).map((s) => s.order);
  const order = dayOrders.length ? Math.max(...dayOrders) + 1 : 0;
  const key = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || "slot"}-${order}`;
  await writeMeta(planId, { scaffold: [...meta.scaffold, { key, label: label.slice(0, 40), day, order }] });
}

/** Toggle weekly recurrence on/off for a plan. */
export async function setRecurrence(slug: string, recurrence: PlanRecurrence | null): Promise<void> {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  await writeMeta((plan as Row).id as string, { recurrence });
}

/** Delete a plan and all its options/members (irreversible). Owner only. */
export async function deletePlan(slug: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) return;
  const planId = (plan as Row).id as string;
  await db.from("plan_options").delete().eq("plan_id", planId);
  await db.from("plan_members").delete().eq("plan_id", planId);
  await db.from("plans").delete().eq("id", planId);
}

/** Smart-resolve a typed place and add it as a voteable option in a given slot. */
export async function addCustomOption(slug: string, query: string, slotKey: string, day: number): Promise<boolean> {
  const { resolvePlace } = await import("./ai");
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id, place_address").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const row = plan as Row;
  const planId = row.id as string;
  const resolved = await resolvePlace(query, (row.place_address as string) || "London, UK");
  if (!resolved) return false;

  // inherit slot meta (label / order) from a sibling option in the same slot
  const { data: existing } = await db.from("plan_options").select("payload").eq("plan_id", planId);
  const sib = ((existing as Row[]) ?? []).find((o) => {
    const p = (o.payload as Row) ?? {};
    return p.slot === slotKey && ((p.day as number) ?? 1) === day;
  });
  const meta = (sib?.payload as Row) ?? {};
  await db.from("plan_options").insert({
    plan_id: planId, kind: "activity", source: "human",
    title: resolved.title, subtitle: resolved.subtitle ?? null, why: resolved.why ?? null,
    source_url: mapsUrl(resolved.map_query) ?? null, source_label: "Added",
    payload: {
      slot: slotKey, slot_label: (meta.slot_label as string) || "Pick one",
      slot_order: (meta.slot_order as number) ?? 0, day, fixed: false, chosen: false,
      tile: resolved.tile, place_name: resolved.place_name ?? null, time: resolved.time ?? null,
    },
  } as never);
  return true;
}

/** Pick one option for its slot: marks it chosen, clears siblings, re-derives the plan headline. */
export async function choosePlanOption(slug: string, optionId: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const planId = (plan as Row).id as string;

  const { data: optsData } = await db.from("plan_options").select("*").eq("plan_id", planId);
  const opts = (optsData as Row[]) ?? [];
  const target = opts.find((o) => (o.id as string) === optionId);
  if (!target) throw new Error("option not found");
  const tp = (target.payload as Row) ?? {};
  const slot = tp.slot as string;
  const day = (tp.day as number) ?? 1;

  // toggle: clicking the already-chosen option clears the slot
  const already = !!tp.chosen;
  for (const o of opts) {
    const p = (o.payload as Row) ?? {};
    if (p.slot === slot && ((p.day as number) ?? 1) === day) {
      const chosen = !already && (o.id as string) === optionId;
      if (!!p.chosen !== chosen) {
        await db.from("plan_options").update({ payload: { ...p, chosen } } as never).eq("id", o.id as string);
      }
    }
  }
  await deriveHeadline(planId, slug);
}

// Cover comes from the chosen option of the FIRST slot. The hero TITLE only
// follows the chosen venue for single-slot plans; multi-slot plans keep their
// own (AI/user) title rather than naming themselves after the first location.
async function deriveHeadline(planId: string, slug: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: optsData } = await db.from("plan_options").select("*").eq("plan_id", planId);
  const allRows = (optsData as Row[]) ?? [];
  const opts = allRows.filter((o) => ((o.payload as Row) ?? {}).slot);
  const meta = readMeta(allRows);
  const optSlotCount = new Set(opts.map((o) => {
    const p = (o.payload as Row) ?? {};
    return `${(p.day as number) ?? 1}:${p.slot}`;
  })).size;
  // a plan is "single" only if it truly has one slot (scaffold is authoritative)
  const slotCount = Math.max(meta.scaffold.length, optSlotCount);
  const chosen = opts.filter((o) => ((o.payload as Row) ?? {}).chosen);
  chosen.sort((a, b) => {
    const pa = (a.payload as Row) ?? {}, pb = (b.payload as Row) ?? {};
    return (((pa.day as number) ?? 1) - ((pb.day as number) ?? 1)) ||
      (((pa.slot_order as number) ?? 0) - ((pb.slot_order as number) ?? 0));
  });
  const head = chosen[0];
  const single = slotCount <= 1;
  if (!head) {
    // no pick yet → no venue headline (multi-slot falls back to its title either way)
    const patch: Record<string, unknown> = { place_url: null, activity: null };
    if (single) patch.place_name = null;
    await db.from("plans").update(patch as never).eq("slug", slug);
    return;
  }
  const hp = (head.payload as Row) ?? {};
  const patch: Record<string, unknown> = {
    place_url: (head.source_url as string) ?? null,
    cover_hue: (hp.tile as string) ?? "city",
    activity: single ? (head.title as string) : null, // multi-slot never names itself after a venue
  };
  if (single) patch.place_name = (hp.place_name as string) ?? null;
  await db.from("plans").update(patch as never).eq("slug", slug);
}

/** Set the plan's date/time (ISO). */
export async function setPlanWhen(slug: string, startsAt: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  await db.from("plans").update({ starts_at: startsAt } as never).eq("slug", slug);
}

/** Rename a plan (owner-editable title). */
export async function setPlanTitle(slug: string, title: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  await db.from("plans").update({ title: title.slice(0, 140), activity: title.slice(0, 140) } as never).eq("slug", slug);
}

/** Update the plan's general area/location. */
export async function setPlanLocation(slug: string, location: string): Promise<void> {
  const db = supabaseAdmin();
  await db.from("plans").update({ place_address: location.slice(0, 200) } as never).eq("slug", slug);
}

/** Invite people: add as members + drop an invite + notification for each. */
export async function invitePeople(slug: string, profileIds: string[]): Promise<void> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: plan } = await db.from("plans").select("id, title, activity, cover_hue").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const p = plan as Row;
  const pid = p.id as string;
  const rows = profileIds.map((id) => ({ plan_id: pid, profile_id: id, rsvp: "in", joined_via: "app" }));
  if (!rows.length) return;
  await db.from("plan_members").upsert(rows as never, { onConflict: "plan_id,profile_id" } as never);

  const { data: meProfile } = await db.from("profiles").select("name").eq("id", me).maybeSingle();
  const myName = (meProfile as Row | null)?.name as string ?? "A friend";
  const activity = (p.activity as string) || (p.title as string) || "a plan";
  const cover = deriveCover(p.cover_hue as string) ?? "/img/cover-hike.png";
  for (const id of profileIds) {
    await db.from("invites").insert({
      to_id: id, from_id: me, from_label: myName, kind: "friend", activity, plan_slug: slug, cover,
    } as never);
    await notify(id, `${myName} invited you to ${activity}`, "invite", slug);
  }
}

/** Move a plan through its lifecycle: open → locked → completed. Owner only. */
export async function updatePlanStatus(slug: string, status: "open" | "locked" | "completed"): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = { status };
  patch.completed_at = status === "completed" ? new Date().toISOString() : null;
  const { error } = await db.from("plans").update(patch as never).eq("slug", slug);
  if (error) throw new Error(error.message);

  // tell members when it's locked in
  if (status === "locked") {
    const { data: plan } = await db.from("plans").select("id, title, activity").eq("slug", slug).maybeSingle();
    if (plan) {
      const me = await currentUserId();
      const title = ((plan as Row).activity as string) || ((plan as Row).title as string) || "your plan";
      const { data: members } = await db.from("plan_members").select("profile_id").eq("plan_id", (plan as Row).id as string);
      for (const m of (members as Row[]) ?? []) {
        const id = m.profile_id as string;
        if (id !== me) await notify(id, `"${title}" is locked in`, "locked", slug);
      }
    }
    // recurring becomes real only on lock — spin up the independent instances
    await materializeSeries(slug);
  }
}

// recurrence cadence → the dates of the next N occurrences (incl. the base)
function occurrenceDates(base: Date, r: Recurrence): string[] {
  const out: string[] = [];
  if (r.cadence === "monthly") {
    for (let i = 0; i < 6; i++) { const d = new Date(base); d.setMonth(base.getMonth() + i); out.push(d.toISOString()); }
  } else {
    const step = r.cadence === "biweekly" ? 14 : 7;
    for (let i = 0; i < 8; i++) { const d = new Date(base); d.setDate(base.getDate() + step * i); out.push(d.toISOString()); }
  }
  return out;
}
// first occurrence from "now" when the plan has no fixed start
function firstOccurrence(r: Recurrence): Date {
  const d = new Date();
  const [h, min] = (r.time ?? "18:00").split(":").map(Number);
  d.setHours(h || 18, min || 0, 0, 0);
  if (r.cadence === "monthly") {
    d.setDate(r.monthday ?? 1);
    if (d.getTime() < Date.now()) d.setMonth(d.getMonth() + 1);
  } else {
    while (d.getDay() !== r.weekday || d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  }
  return d;
}

/** On lock, clone a recurring plan into independent future-dated instances (a series). */
async function materializeSeries(slug: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: planRow } = await db.from("plans").select("*").eq("slug", slug).maybeSingle();
  if (!planRow) return;
  const plan = planRow as Row;
  const planId = plan.id as string;
  const me = await currentUserId();

  const { data: optRows } = await db.from("plan_options").select("*").eq("plan_id", planId);
  const allRows = (optRows as Row[]) ?? [];
  const meta = readMeta(allRows);
  if (!meta.recurrence || meta.materialized) return; // not recurring, or already a series

  const r = meta.recurrence;
  const base = plan.starts_at ? new Date(plan.starts_at as string) : firstOccurrence(r);
  const dates = occurrenceDates(base, r);
  const seriesId = globalThis.crypto.randomUUID();

  // anchor this plan as instance #1
  await db.from("plans").update({ starts_at: dates[0] } as never).eq("id", planId);
  await writeMeta(planId, { seriesId, materialized: true });

  // options to copy (activity options only — not the meta row or date candidates)
  const cloneOpts = allRows.filter((o) => (o.title as string) !== META_TITLE && !((o.payload as Row) ?? {}).date_option);
  const { data: memRows } = await db.from("plan_members").select("profile_id").eq("plan_id", planId);
  const members = ((memRows as Row[]) ?? []).map((m) => m.profile_id as string);

  for (let i = 1; i < dates.length; i++) {
    const childSlug = planSlug(`${Date.now()}-${plan.title}-${i}`);
    const { data: child } = await db.from("plans").insert({
      slug: childSlug,
      title: plan.title, intent: plan.intent, status: "locked", visibility: plan.visibility,
      creator_id: me, group_id: plan.group_id, ai_empowered: plan.ai_empowered,
      activity: plan.activity, starts_at: dates[i], place_name: plan.place_name,
      place_address: plan.place_address, place_url: plan.place_url, why: plan.why,
      key_info: plan.key_info, cover_hue: plan.cover_hue,
    } as never).select("id").single();
    const childId = (child as unknown as Row | null)?.id as string;
    if (!childId) continue;
    if (cloneOpts.length) {
      await db.from("plan_options").insert(cloneOpts.map((o) => ({
        plan_id: childId, kind: o.kind, source: o.source, title: o.title, subtitle: o.subtitle,
        why: o.why, image_url: o.image_url, source_url: o.source_url, source_label: o.source_label,
        payload: o.payload, suggested_by: null,
      })) as never);
    }
    // each instance carries the scaffold but does NOT itself recur (recurrence null)
    await writeMeta(childId, { scaffold: meta.scaffold, recurrence: null, seriesId, materialized: true });
    await db.from("plan_members").insert(
      members.map((pid) => ({ plan_id: childId, profile_id: pid, rsvp: pid === me ? "in" : "maybe", joined_via: "app" })) as never,
    );
  }
}

/** Stop a recurring series: clear recurrence + delete future instances (owner). */
export async function stopSeries(slug: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: planRow } = await db.from("plans").select("id, starts_at").eq("slug", slug).maybeSingle();
  if (!planRow) return;
  const planId = (planRow as Row).id as string;
  const { data: optRows } = await db.from("plan_options").select("payload, title").eq("plan_id", planId);
  const meta = readMeta((optRows as Row[]) ?? []);
  await writeMeta(planId, { recurrence: null });
  if (!meta.seriesId) return;
  // delete sibling instances dated after this one
  const cutoff = (planRow as Row).starts_at as string;
  const { data: siblings } = await db.from("plan_options").select("plan_id, payload").eq("title", META_TITLE);
  const sibPlanIds = ((siblings as Row[]) ?? [])
    .filter((s) => ((s.payload as Row)?.meta as PlanMeta | undefined)?.seriesId === meta.seriesId)
    .map((s) => s.plan_id as string)
    .filter((id) => id !== planId);
  for (const id of sibPlanIds) {
    const { data: sp } = await db.from("plans").select("starts_at").eq("id", id).maybeSingle();
    const sa = (sp as Row | null)?.starts_at as string | undefined;
    if (!cutoff || (sa && sa > cutoff)) {
      await db.from("plan_options").delete().eq("plan_id", id);
      await db.from("plan_members").delete().eq("plan_id", id);
      await db.from("plans").delete().eq("id", id);
    }
  }
}

// Throw unless the acting user owns the plan — guards owner-only actions.
async function assertOwner(slug: string): Promise<void> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data } = await db.from("plans").select("creator_id").eq("slug", slug).maybeSingle();
  if (!data) throw new Error("plan not found");
  if ((data as Row).creator_id !== me) throw new Error("Only the plan owner can do that");
}

// ---------- communities / events / nudges / invites / notifications ----------
export interface CommunityCard { id: string; name: string; tag: string; members: string }
export interface OpenEventCard { id: string; community: string; activity: string; place: string; dateLabel: string; cover: string; going: number; slug: string }
export interface NudgeCard { id: string; from: Profile; message: string; when: string }
export interface InviteCard { id: string; fromLabel: string; kind: string; activity: string; slug: string; dateLabel: string; cover: string }
export interface NotificationCard { id: string; text: string; when: string; slug?: string; kind?: string }

export async function getCommunities(): Promise<CommunityCard[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("communities").select("*").order("created_at");
  return ((data as Row[]) ?? []).map((c) => ({
    id: c.id as string, name: c.name as string, tag: (c.tag as string) ?? "", members: (c.members_label as string) ?? "0",
  }));
}

export async function getOpenEvents(): Promise<OpenEventCard[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("open_events").select("*").order("created_at");
  return ((data as Row[]) ?? []).map((e) => ({
    id: e.id as string, community: (e.community_name as string) ?? "", activity: e.activity as string,
    place: (e.place as string) ?? "", dateLabel: (e.date_label as string) ?? "", cover: (e.cover as string) ?? "/img/cover-park.png",
    going: (e.going as number) ?? 0, slug: (e.plan_slug as string) ?? "wild-otter-42",
  }));
}

export async function getNudges(): Promise<NudgeCard[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("nudges").select("*, from:profiles!from_id(*)").eq("to_id", await currentUserId()).eq("status", "pending").order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((n) => ({
    id: n.id as string, from: mapProfile(n.from as Row) ?? ({ name: "Someone" } as Profile),
    message: n.message as string, when: (n.when_text as string) ?? "",
  }));
}

export async function getInvites(): Promise<InviteCard[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("invites").select("*").eq("to_id", await currentUserId()).order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((i) => ({
    id: i.id as string, fromLabel: (i.from_label as string) ?? "Someone", kind: (i.kind as string) ?? "friend",
    activity: (i.activity as string) ?? "", slug: (i.plan_slug as string) ?? "wild-otter-42",
    dateLabel: (i.date_label as string) ?? "", cover: (i.cover as string) ?? "/img/cover-hike.png",
  }));
}

export async function getNotifications(): Promise<NotificationCard[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("notifications").select("*").eq("profile_id", await currentUserId()).eq("acknowledged", false).order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((n) => ({
    id: n.id as string, text: n.text as string, when: (n.when_text as string) ?? "",
    slug: (n.plan_slug as string) ?? undefined, kind: (n.kind as string) ?? undefined,
  }));
}

// ---------- writes: notifications, nudges, poke, mark-read ----------

/** Internal: drop a notification for a profile. */
async function notify(profileId: string, text: string, kind: string, planSlug?: string | null) {
  const db = supabaseAdmin();
  await db.from("notifications").insert({
    profile_id: profileId, text, kind, plan_slug: planSlug ?? null, acknowledged: false,
  } as never);
}

/** Mark all of the acting user's notifications read (called when the panel is opened). */
export async function markNotificationsRead(): Promise<void> {
  const db = supabaseAdmin();
  await db.from("notifications").update({ acknowledged: true } as never).eq("profile_id", await currentUserId());
}

/**
 * Nudge a friend: the intent to do something. Creates a shared, empty collaborative
 * plan (both are members) so the recipient lands somewhere to co-build, plus a nudge
 * row + a notification linking to that plan.
 */
export async function sendNudge(toId: string, message: string, whenText: string): Promise<{ slug: string }> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: meProfile } = await db.from("profiles").select("name").eq("id", me).maybeSingle();
  const myName = (meProfile as Row | null)?.name as string ?? "A friend";

  // shared empty plan to figure it out together
  const slug = planSlug(`${Date.now()}-nudge`);
  const { data: plan } = await db.from("plans").insert({
    slug,
    title: message?.trim() ? message.trim().slice(0, 140) : `${myName} wants to do something`,
    intent: message ?? null,
    status: "open",
    visibility: "invite",
    creator_id: me,
    ai_empowered: true,
    cover_hue: "city",
  } as never).select("id").single();
  const planId = (plan as unknown as Row | null)?.id as string;
  if (planId) {
    await db.from("plan_members").upsert([
      { plan_id: planId, profile_id: me, rsvp: "in", joined_via: "app" },
      { plan_id: planId, profile_id: toId, rsvp: "maybe", joined_via: "app" },
    ] as never, { onConflict: "plan_id,profile_id" } as never);
    await writeMeta(planId, { scaffold: [{ key: "plan", label: "What shall we do?", day: 1, order: 0 }] });
  }

  await db.from("nudges").insert({ from_id: me, to_id: toId, message: message ?? null, when_text: whenText, status: "pending" } as never);
  const detail = message?.trim() ? ` — "${message.trim()}"` : "";
  await notify(toId, `${myName} nudged you${detail}`, "nudge", slug);
  return { slug };
}

/** Poke everyone invited to a plan who hasn't picked/voted yet. Owner action. */
export async function pokeNonVoters(slug: string): Promise<number> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: plan } = await db.from("plans").select("id, title").eq("slug", slug).maybeSingle();
  if (!plan) return 0;
  const planId = (plan as Row).id as string;
  const { data: meProfile } = await db.from("profiles").select("name").eq("id", me).maybeSingle();
  const myName = (meProfile as Row | null)?.name as string ?? "Someone";
  const { data: members } = await db.from("plan_members").select("profile_id").eq("plan_id", planId);
  const others = ((members as Row[]) ?? []).map((m) => m.profile_id as string).filter((id) => id !== me);
  for (const id of others) await notify(id, `${myName} poked you to weigh in on "${(plan as Row).title as string}"`, "poke", slug);
  return others.length;
}
