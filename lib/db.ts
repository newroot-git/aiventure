import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { generateDrop, generateSlotOptions, mapsUrl, type DropInput, type DropSlot } from "./ai";
import { planSlug } from "./slug";
import type { Plan, PlanOption, PlanMember, Profile } from "./types";

// Demo identity (stands in for auth) — the seeded "Josh" profile.
export const DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";

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
interface Recurrence { cadence: "weekly"; weekday: number; time?: string | null }
interface PlanMeta { scaffold: ScaffoldSlot[]; recurrence: Recurrence | null }

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
  return { scaffold: m?.scaffold ?? [], recurrence: m?.recurrence ?? null };
}

/** Create a plan. aiBuild=true → AI fills slots; false → empty named skeleton. */
export async function createPlanFromDrop(input: DropInput): Promise<{ slug: string }> {
  const aiBuild = !!input.aiBuild;
  let title = input.intent.slice(0, 140);
  let slots: DropSlot[] = [];
  if (aiBuild) {
    const drop = await generateDrop(input);
    slots = drop.slots ?? [];
    if (drop.title) title = drop.title;
  }
  const scaffold = aiBuild ? scaffoldFromSlots(slots) : defaultScaffold(input.scope, input.nights);
  const slug = planSlug(`${Date.now()}-${input.intent}`);
  const db = supabaseAdmin();

  const firstTile = slots[0]?.options[0]?.tile ?? "city";
  const { data: plan, error } = await db
    .from("plans")
    .insert({
      slug,
      title,
      intent: input.intent,
      status: "open",
      visibility: "invite",
      creator_id: DEMO_USER_ID,
      ai_empowered: true,
      cover_hue: firstTile,
      place_address: input.location ?? null, // stash search area for later refine + general "where"
    } as never)
    .select("id")
    .single();
  if (error || !plan) throw new Error(error?.message ?? "insert plan failed");

  const planId = (plan as { id: string }).id;
  const rows = flattenSlots(planId, slots);
  if (rows.length) {
    const { error: e2 } = await db.from("plan_options").insert(rows as never);
    if (e2) throw new Error(e2.message);
  }
  await writeMeta(planId, { scaffold });
  // ensure the creator is a member so the plan shows on their home/calendar
  await db.from("plan_members")
    .upsert({ plan_id: planId, profile_id: DEMO_USER_ID, rsvp: "in", joined_via: "app" } as never,
      { onConflict: "plan_id,profile_id" } as never);
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
export interface PlanRecurrence { cadence: "weekly"; weekday: number; time?: string | null }

/** Load a persisted plan + its options + members + meta by slug (null if not found). */
export async function getPlanBySlug(slug: string): Promise<{
  plan: Plan;
  options: PlanOption[];
  members: PlanMember[];
  scaffold: PlanScaffoldSlot[];
  recurrence: PlanRecurrence | null;
} | null> {
  const db = supabaseAdmin();
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
  const options = allOpts.filter((o) => (o.title as string) !== META_TITLE);

  return {
    plan: {
      ...(row as unknown as Plan),
      key_info: (row.key_info as Plan["key_info"]) ?? [],
      cover_url: deriveCover(row.cover_hue as string | null),
    },
    options: options as unknown as PlanOption[],
    members: ((members ?? []) as Record<string, unknown>[]).map((m) => ({
      ...m,
      profile: mapProfile(m.profile as Record<string, unknown>),
    })) as unknown as PlanMember[],
    scaffold: meta.scaffold,
    recurrence: meta.recurrence,
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
  id: string; slug: string; activity: string; dateLabel: string; date: string; place: string;
  groupName: string; members: Profile[]; status: "upcoming" | "past"; adventureNo?: number;
  cover: string; tile: string; recurrence?: { weekday: number; time?: string | null } | null;
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
  const { data: mem } = await db.from("plan_members").select("plan_id").eq("profile_id", DEMO_USER_ID);
  const ids = ((mem as Row[]) ?? []).map((m) => m.plan_id as string);
  const orFilter = ids.length
    ? `creator_id.eq.${DEMO_USER_ID},id.in.(${ids.join(",")})`
    : `creator_id.eq.${DEMO_USER_ID}`;
  const { data } = await db.from("plans").select(PLAN_SELECT).or(orFilter).order("created_at", { ascending: false });
  const cards = ((data as Row[]) ?? []).map(mapPlanCard);
  // attach recurrence from each plan's meta row
  const planIds = cards.map((c) => c.id);
  if (planIds.length) {
    const { data: metas } = await db.from("plan_options")
      .select("plan_id, payload").eq("title", META_TITLE).in("plan_id", planIds);
    const recByPlan = new Map<string, { weekday: number; time?: string | null }>();
    for (const m of (metas as Row[]) ?? []) {
      const rec = ((m.payload as Row)?.meta as PlanMeta | undefined)?.recurrence;
      if (rec) recByPlan.set(m.plan_id as string, { weekday: rec.weekday, time: rec.time ?? null });
    }
    for (const c of cards) c.recurrence = recByPlan.get(c.id) ?? null;
  }
  return cards;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("*").eq("id", DEMO_USER_ID).maybeSingle();
  return mapProfile(data as Row | null);
}

export async function getFriends(): Promise<{ profile: Profile; shared: string[] }[]> {
  const db = supabaseAdmin();
  const { data: profiles } = await db.from("profiles").select("*").neq("id", DEMO_USER_ID);
  const groups = await getUserGroups();
  return ((profiles as Row[]) ?? [])
    .map((r) => mapProfile(r))
    .filter((p): p is Profile => !!p)
    .map((p) => ({ profile: p, shared: groups.filter((g) => g.members.some((m) => m.id === p.id)).map((g) => g.name) }));
}

export interface GroupCard { id: string; name: string; members: Profile[] }

export async function getUserGroups(): Promise<GroupCard[]> {
  const db = supabaseAdmin();
  const { data: gm } = await db.from("group_members").select("group_id").eq("profile_id", DEMO_USER_ID);
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

/** Append a new (empty) slot to the plan's scaffold. */
export async function addSlot(slug: string, label: string, day = 1): Promise<void> {
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

/** Delete a plan and all its options/members (irreversible). */
export async function deletePlan(slug: string): Promise<void> {
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
  const db = supabaseAdmin();
  await db.from("plans").update({ starts_at: startsAt } as never).eq("slug", slug);
}

/** Invite people (add them as plan members). */
export async function invitePeople(slug: string, profileIds: string[]): Promise<void> {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const pid = (plan as Row).id as string;
  const rows = profileIds.map((id) => ({ plan_id: pid, profile_id: id, rsvp: "in", joined_via: "app" }));
  if (rows.length) await db.from("plan_members").upsert(rows as never, { onConflict: "plan_id,profile_id" } as never);
}

/** Move a plan through its lifecycle: open (planning) → locked → completed. */
export async function updatePlanStatus(slug: string, status: "open" | "locked" | "completed"): Promise<void> {
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = { status };
  patch.completed_at = status === "completed" ? new Date().toISOString() : null;
  const { error } = await db.from("plans").update(patch as never).eq("slug", slug);
  if (error) throw new Error(error.message);
}

// ---------- communities / events / nudges / invites / notifications ----------
export interface CommunityCard { id: string; name: string; tag: string; members: string }
export interface OpenEventCard { id: string; community: string; activity: string; place: string; dateLabel: string; cover: string; going: number; slug: string }
export interface NudgeCard { id: string; from: Profile; message: string; when: string }
export interface InviteCard { id: string; fromLabel: string; kind: string; activity: string; slug: string; dateLabel: string; cover: string }
export interface NotificationCard { id: string; text: string; when: string; slug?: string }

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
  const { data } = await db.from("nudges").select("*, from:profiles!from_id(*)").eq("to_id", DEMO_USER_ID).eq("status", "pending").order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((n) => ({
    id: n.id as string, from: mapProfile(n.from as Row) ?? ({ name: "Someone" } as Profile),
    message: n.message as string, when: (n.when_text as string) ?? "",
  }));
}

export async function getInvites(): Promise<InviteCard[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("invites").select("*").eq("to_id", DEMO_USER_ID).order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((i) => ({
    id: i.id as string, fromLabel: (i.from_label as string) ?? "Someone", kind: (i.kind as string) ?? "friend",
    activity: (i.activity as string) ?? "", slug: (i.plan_slug as string) ?? "wild-otter-42",
    dateLabel: (i.date_label as string) ?? "", cover: (i.cover as string) ?? "/img/cover-hike.png",
  }));
}

export async function getNotifications(): Promise<NotificationCard[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("notifications").select("*").eq("profile_id", DEMO_USER_ID).eq("acknowledged", false).order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((n) => ({
    id: n.id as string, text: n.text as string, when: (n.when_text as string) ?? "", slug: (n.plan_slug as string) ?? undefined,
  }));
}
