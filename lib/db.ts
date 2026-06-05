import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";
import { generateDrop, generateSlotOptions, resolvePlace, mapsUrl, type DropInput, type DropSlot } from "./ai";
import { planSlug } from "./slug";
import { verifyGuest } from "./guest";
import type { Plan, PlanOption, PlanMember, Profile, RSVP, Visibility, PlanStatus } from "./types";

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
    // getSession reads the cookie (no network) — middleware already validates/refreshes
    // the token each request, so this is both safe and much faster than getUser().
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) return await resolveAuthProfile(session.user.id, session.user.email ?? null);
  } catch {}
  try {
    const c = await cookies();
    // verify the HMAC signature before trusting the cookie's uid (stops impersonation
    // by setting av_uid=<someone-else's-uuid>). Dev switcher still works via verifyGuest.
    const uid = verifyGuest(c.get("av_uid")?.value);
    if (uid) {
      // only honour av_uid for genuine guest profiles (no linked auth account) —
      // stops a forged/stale cookie from impersonating a real or seeded user.
      const db = supabaseAdmin();
      const { data } = await db.from("profiles").select("id, auth_id, name").eq("id", uid).maybeSingle();
      const row = data as Row | null;
      if (row && !row.auth_id) {
        // in prod, av_uid must be an actual minted guest ("Guest NNNN") — this stops a
        // leftover dev-switch cookie (e.g. =Josh) from masking a fresh account. The dev
        // profile-switcher (DEV_SWITCH=1) may still resolve any seed profile.
        const devMode = process.env.NEXT_PUBLIC_DEV_SWITCH === "1";
        const isGuest = typeof row.name === "string" && (row.name as string).startsWith("Guest ");
        if (devMode || isGuest) return row.id as string;
      }
    }
  } catch {}
  return "";
});

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
  const db = supabaseAdmin();
  const me = await currentUserId();
  // default location to the creator's home area (not London) when none is given.
  // select("*") so it's safe before the home_area migration is applied.
  const { data: meProf } = await db.from("profiles").select("*").eq("id", me).maybeSingle();
  const homeArea = ((meProf as Row | null)?.home_area as string) || "London, UK";
  const baseLocation = input.location?.trim() ? input.location : homeArea;

  let title = input.intent?.trim() ? input.intent.slice(0, 140) : "New plan";
  let slots: DropSlot[] = [];
  // the area refines/per-slot AI will use — the AI's resolved area beats the
  // form value, so a HK plan stays HK throughout.
  let area: string | null = baseLocation;
  if (aiBuild) {
    const drop = await generateDrop({ ...input, location: baseLocation });
    slots = drop.slots ?? [];
    if (drop.title) title = drop.title;
    if (drop.area) area = drop.area;
  }
  const scaffold = aiBuild ? scaffoldFromSlots(slots) : defaultScaffold(input.scope, input.nights);
  const slug = planSlug(`${Date.now()}-${input.intent}`);

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
    .select("*, profile:profiles(id, name, avatar_emoji)")
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
    home_area: (r.home_area as string) ?? null,
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
  groupName: string; members: Profile[]; status: "upcoming" | "past"; phase: PlanStatus; adventureNo?: number;
  cover: string; tile: string; recurrence?: PlanRecurrence | null; completedAt: string;
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
    phase: ((r.status as PlanStatus) ?? "open"),
    completedAt: (r.completed_at as string) || "",
    adventureNo: (r.adventure_no as number) ?? undefined,
    cover: deriveCover(hue) || "/img/cover-hike.png",
    tile: hue,
  };
}

const PLAN_SELECT = "*, group:groups(name), plan_members(rsvp, profile:profiles(id, name, avatar_emoji))";

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

// cache()-wrapped: the shell layout and the page it renders both call these inbox
// getters in the same request. cache() dedups so each runs once per navigation
// instead of double-hitting Supabase.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("*").eq("id", await currentUserId()).maybeSingle();
  return mapProfile(data as Row | null);
});

/** Update the current user's own profile (onboarding / profile edit). */
export async function updateMyProfile(patch: { name?: string; interests?: string[]; interest_notes?: string; home_area?: string }): Promise<void> {
  const me = await currentUserId();
  if (!me) return;
  const db = supabaseAdmin();
  const upd: Record<string, unknown> = {};
  if (typeof patch.name === "string" && patch.name.trim()) upd.name = patch.name.trim().slice(0, 60);
  if (Array.isArray(patch.interests)) {
    // cap count + element length so a caller can't store an unbounded blob
    upd.interests = patch.interests.filter((x) => typeof x === "string").slice(0, 40).map((x) => x.slice(0, 60));
  }
  if (typeof patch.interest_notes === "string") upd.interest_notes = patch.interest_notes.slice(0, 500);
  // home_area lives in the same row (migration 0005 applied) — one write, not two
  if (typeof patch.home_area === "string") upd.home_area = patch.home_area.trim().slice(0, 120);
  if (Object.keys(upd).length) await db.from("profiles").update(upd as never).eq("id", me);
}

/** All seeded profiles — used by the dev profile switcher. */
export async function getAllProfiles(): Promise<Profile[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("*").order("created_at");
  return ((data as Row[]) ?? []).map((r) => mapProfile(r)).filter((p): p is Profile => !!p);
}

/**
 * Create a ready-to-explore DEMO account: a named guest profile pre-seeded with its
 * OWN crew (so accounts don't overlap), a group, a pending nudge, an invite to a plan,
 * and one completed adventure — so the app isn't empty on first open. Returns the new
 * profile id (the caller sets the signed av_uid cookie).
 */
const DEMO_CREW = [
  { name: "Sam", interests: ["Hiking", "Craft beer", "Live music"] },
  { name: "Priya", interests: ["Coffee", "Galleries", "Yoga"] },
  { name: "Leo", interests: ["Football", "Board games", "BBQ"] },
];
export async function seedDemoAccount(name: string): Promise<{ userId: string }> {
  const db = supabaseAdmin();
  const clean = (name || "").trim().slice(0, 40) || "Explorer";

  const { data: user } = await db.from("profiles")
    .insert({ name: clean, email: null, interests: [] } as never).select("id").single();
  const userId = (user as unknown as Row).id as string;

  // the crew — each demo account gets its own copies so nobody shares state
  const crew: string[] = [];
  for (const c of DEMO_CREW) {
    const { data } = await db.from("profiles")
      .insert({ name: c.name, email: null, interests: c.interests } as never).select("id").single();
    if (data) crew.push((data as unknown as Row).id as string);
  }

  // a group with the whole crew
  const { data: grp } = await db.from("groups").insert({ name: "The Usual Crew", owner_id: userId } as never).select("id").single();
  const groupId = (grp as unknown as Row | null)?.id as string | undefined;
  if (groupId) {
    await db.from("group_members").insert(
      [userId, ...crew].map((pid) => ({ group_id: groupId, profile_id: pid })) as never,
    );
  }

  // a pending nudge from the first crew member (+ its notification)
  if (crew[0]) {
    await db.from("nudges").insert({ from_id: crew[0], to_id: userId, message: "keen for something this weekend?", when_text: "This weekend", status: "pending" } as never);
    await notify(userId, `${DEMO_CREW[0].name} nudged you — "keen for something this weekend?". Up for it?`, "nudge", null);
  }

  // an invite to a real upcoming plan owned by another crew member
  if (crew[1]) {
    const inviteSlug = planSlug(`${Date.now()}-demo-invite`);
    const { data: ip } = await db.from("plans").insert({
      slug: inviteSlug, title: "Sunday roast & a walk", intent: "Sunday roast then a walk", activity: "Sunday roast & a walk",
      status: "open", visibility: "invite", creator_id: crew[1], ai_empowered: true, cover_hue: "roast",
      place_address: "Richmond, London", place_name: "Richmond",
    } as never).select("id").single();
    const ipId = (ip as unknown as Row | null)?.id as string | undefined;
    if (ipId) {
      await writeMeta(ipId, { scaffold: [{ key: "plan", label: "The plan", day: 1, order: 0 }] });
      await db.from("plan_members").insert([
        { plan_id: ipId, profile_id: crew[1], rsvp: "in", joined_via: "app" },
        { plan_id: ipId, profile_id: userId, rsvp: "maybe", joined_via: "app" },
      ] as never);
      await db.from("invites").insert({ to_id: userId, from_id: crew[1], from_label: DEMO_CREW[1].name, kind: "friend", activity: "Sunday roast & a walk", plan_slug: inviteSlug, cover: "/img/cover-roast.png" } as never);
      await notify(userId, `${DEMO_CREW[1].name} invited you to Sunday roast & a walk`, "invite", inviteSlug);
    }
  }

  // one completed adventure so the log + profile aren't empty
  const advSlug = planSlug(`${Date.now()}-demo-adv`);
  const { data: adv } = await db.from("plans").insert({
    slug: advSlug, title: "Coffee & a coastal walk", intent: "Coffee then a coastal walk", activity: "Coffee & a coastal walk",
    status: "completed", visibility: "invite", creator_id: userId, ai_empowered: true, cover_hue: "coffee",
    place_address: "Brighton", place_name: "Brighton", adventure_no: 1,
    starts_at: null, completed_at: new Date().toISOString(),
  } as never).select("id").single();
  const advId = (adv as unknown as Row | null)?.id as string | undefined;
  if (advId) {
    await writeMeta(advId, { scaffold: [{ key: "plan", label: "The plan", day: 1, order: 0 }] });
    await db.from("plan_members").insert(
      [userId, ...crew.slice(0, 2)].map((pid) => ({ plan_id: advId, profile_id: pid, rsvp: "in", joined_via: "app" })) as never,
    );
  }

  return { userId };
}

export async function getFriends(): Promise<{ profile: Profile; shared: string[] }[]> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) return [];
  // Friends = people I actually share something with (a group or a plan). There's no
  // global friendships table yet, so this scopes the picker to my real network instead
  // of returning the entire userbase. New users with no connections get an empty list.
  const groups = await getUserGroups();
  const connected = new Set<string>();
  for (const g of groups) for (const m of g.members) if (m.id !== me) connected.add(m.id);
  const { data: myPlans } = await db.from("plan_members").select("plan_id").eq("profile_id", me);
  const planIds = ((myPlans as Row[]) ?? []).map((m) => m.plan_id as string);
  if (planIds.length) {
    const { data: coMembers } = await db.from("plan_members").select("profile_id").in("plan_id", planIds);
    for (const m of (coMembers as Row[]) ?? []) {
      const id = m.profile_id as string;
      if (id !== me) connected.add(id);
    }
  }
  if (!connected.size) return [];
  // select only the columns a picker needs — never pull email / private notes
  const { data: profiles } = await db.from("profiles")
    .select("id, auth_id, name, avatar_emoji, interests, home_area, is_paid, created_at")
    .in("id", [...connected]);
  return ((profiles as Row[]) ?? [])
    .map((r) => mapProfile(r))
    .filter((p): p is Profile => !!p)
    .map((p) => ({ profile: { ...p, email: null, interest_notes: null }, shared: groups.filter((g) => g.members.some((m) => m.id === p.id)).map((g) => g.name) }));
}

/** Create a group with the given members (owner = current user). Returns its id. */
export async function createGroup(name: string, memberIds: string[]): Promise<{ id: string }> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) throw new Error("sign in required");
  const clean = (name ?? "").trim().slice(0, 60) || "New crew";
  const { data: g, error } = await db.from("groups").insert({ name: clean, owner_id: me } as never).select("id").single();
  if (error || !g) throw new Error(error?.message ?? "could not create group");
  const gid = (g as Row).id as string;
  // owner always a member; dedupe + cap; only keep string ids
  const ids = Array.from(new Set([me, ...((memberIds ?? []).filter((x) => typeof x === "string"))])).slice(0, 50);
  await db.from("group_members").insert(ids.map((pid) => ({ group_id: gid, profile_id: pid })) as never);
  return { id: gid };
}

export interface GroupCard { id: string; name: string; members: Profile[] }

export async function getUserGroups(): Promise<GroupCard[]> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) return [];
  const { data: gm } = await db.from("group_members").select("group_id").eq("profile_id", me);
  const ids = ((gm as Row[]) ?? []).map((g) => g.group_id as string);
  if (!ids.length) return [];
  const { data } = await db.from("groups").select("*, group_members(profile:profiles(id, name, avatar_emoji))").in("id", ids);
  return ((data as Row[]) ?? []).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    members: ((g.group_members as Row[]) ?? []).map((m) => mapProfile(m.profile as Row)).filter((p): p is Profile => !!p),
  }));
}

export async function getGroup(id: string): Promise<{ group: GroupCard; plans: PlanCard[] } | null> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) return null;
  const { data: g } = await db.from("groups").select("*, group_members(profile:profiles(id, name, avatar_emoji))").eq("id", id).maybeSingle();
  if (!g) return null;
  const gr = g as Row;
  // Authorization: only the owner or a member may read a group's roster + plans.
  // Without this any authenticated user could enumerate crews by guessing UUIDs.
  const isMember = ((gr.group_members as Row[]) ?? []).some((m) => (m.profile as Row)?.id === me);
  const isOwner = (gr.owner_id as string) === me;
  if (!isMember && !isOwner) return null;
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

// Core slot regeneration. Caller must have already authorized + read the option
// rows; this neither asserts ownership nor re-derives the headline, so refineAll
// can run many of these in parallel and derive once at the end.
async function regenSlotOptions(
  planId: string, intent: string, location: string,
  slotKey: string, day: number, allRows: Row[], scaffold: ScaffoldSlot[], feedback?: string,
  append = false,
): Promise<void> {
  const db = supabaseAdmin();
  const { label, order } = slotMetaFrom(scaffold, allRows, slotKey, day);
  const slotRows = allRows.filter((o) => {
    const p = (o.payload as Row) ?? {};
    return p.slot === slotKey && ((p.day as number) ?? 1) === day;
  });
  const fresh = await generateSlotOptions(label, `${intent} (the "${label}" step)`, location, feedback);
  if (!fresh.length) return;
  // append = keep existing options and add these; otherwise replace the slot's options
  if (!append) {
    const ids = slotRows.map((o) => o.id as string);
    if (ids.length) await db.from("plan_options").delete().in("id", ids);
  }
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
}

// shared: load the plan's refine context (id/intent/location + all option rows)
async function refineContext(slug: string) {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id, intent, place_address").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const row = plan as Row;
  const { data: existing } = await db.from("plan_options").select("*").eq("plan_id", row.id as string);
  const allRows = (existing as Row[]) ?? [];
  return {
    planId: row.id as string,
    intent: (row.intent as string) || "something good",
    location: (row.place_address as string) || "London, UK",
    allRows,
    meta: readMeta(allRows),
  };
}

/** Regenerate the voteable options for ONE slot. append=true adds to them instead of replacing. */
export async function refineSlot(slug: string, slotKey: string, day: number, feedback?: string, append = false): Promise<void> {
  await assertOwner(slug);
  const { planId, intent, location, allRows, meta } = await refineContext(slug);
  await regenSlotOptions(planId, intent, location, slotKey, day, allRows, meta.scaffold, feedback, append);
  await deriveHeadline(planId, slug);
}

/** Regenerate EVERY slot's options from one feedback note (optionally just one day). */
export async function refineAll(slug: string, feedback?: string, day?: number): Promise<void> {
  await assertOwner(slug);
  const { planId, intent, location, allRows, meta } = await refineContext(slug);
  // unique (slot,day) targets — prefer scaffold, fall back to whatever options exist
  const seen = new Set<string>();
  const targets: { key: string; day: number }[] = [];
  const push = (key: string, d: number) => { const id = `${d}:${key}`; if (!seen.has(id)) { seen.add(id); targets.push({ key, day: d }); } };
  meta.scaffold.forEach((s) => push(s.key, s.day));
  allRows.forEach((o) => { const p = (o.payload as Row) ?? {}; if (p.slot) push(p.slot as string, (p.day as number) ?? 1); });
  // cap LLM fan-out so one request can't trigger unbounded model calls
  const filtered = (day ? targets.filter((t) => t.day === day) : targets).slice(0, 12);
  // disjoint row sets → safe to regenerate every slot in parallel, then derive once
  await Promise.all(filtered.map((t) => regenSlotOptions(planId, intent, location, t.key, t.day, allRows, meta.scaffold, feedback)));
  await deriveHeadline(planId, slug);
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
  if (!me) throw new Error("sign in required");
  // the option must belong to a plan the caller can participate in
  const { data: opt } = await db.from("plan_options").select("plan_id").eq("id", optionId).maybeSingle();
  if (!opt) throw new Error("option not found");
  const planId = (opt as Row).plan_id as string;
  const { data: plan } = await db.from("plans").select("creator_id, visibility, status").eq("id", planId).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const pr = plan as Row;
  if (pr.creator_id !== me && (pr.visibility as string) !== "open" && !(await isMember(planId, me)))
    throw new Error("not your plan");
  // votes only count while planning — a locked/completed plan is decided
  if ((pr.status as string) !== "open") throw new Error("voting is closed — this plan is locked in");
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
  if (!me) throw new Error("sign in required");
  // Link = capability: anyone who can open the plan by its (unguessable) slug may
  // join + RSVP. No-install participation is the core promise — don't gate it behind
  // invites. RSVP makes them a member, which then unlocks voting/adding ideas.
  const plan = await planAuth(slug);
  await db.from("plan_members").upsert(
    { plan_id: plan.id, profile_id: me, rsvp, joined_via: "app" } as never,
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
  const { planId } = await assertParticipant(slug);
  await db.from("plan_options").insert({
    plan_id: planId, kind: "time", source: "human", title: "date",
    payload: { date_option: true, iso },
  } as never);
}

/** Owner locks one candidate date as the plan's time (clears the candidates). */
export async function lockDate(slug: string, optionId: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: planRow } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!planRow) throw new Error("plan not found");
  const planId = (planRow as Row).id as string;
  const { data: opt } = await db.from("plan_options").select("plan_id, payload").eq("id", optionId).maybeSingle();
  // the date option must belong to THIS plan — stop cross-plan optionId tampering
  if (!opt || (opt as Row).plan_id !== planId) throw new Error("date option not on this plan");
  const iso = ((opt as Row).payload as Row)?.iso as string;
  if (iso) await db.from("plans").update({ starts_at: iso } as never).eq("slug", slug);
  // remove all date candidates on THIS plan now that it's set
  await db.from("plan_options").delete().eq("plan_id", planId).eq("title", "date");
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
  await assertOwner(slug);
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

/** Add a picked/typed place as a voteable option in a slot (from the maps search). */
export async function addCustomOption(slug: string, title: string, slotKey: string, day: number, area?: string): Promise<boolean> {
  const db = supabaseAdmin();
  const { planId } = await assertParticipant(slug);
  if (!title.trim()) return false;

  // inherit slot meta (label / order) from the scaffold or a sibling option
  const { data: existing } = await db.from("plan_options").select("payload, title").eq("plan_id", planId);
  const allRows = (existing as Row[]) ?? [];
  const meta = readMeta(allRows);
  const { label, order } = slotMetaFrom(meta.scaffold, allRows, slotKey, day);
  await db.from("plan_options").insert({
    plan_id: planId, kind: "activity", source: "human",
    title: title.trim().slice(0, 140), subtitle: area ?? null, why: null,
    source_url: mapsUrl(area ? `${title}, ${area}` : title) ?? null, source_label: "Added",
    payload: {
      slot: slotKey, slot_label: label, slot_order: order, day, fixed: false, chosen: false,
      tile: "city", place_name: title.trim().slice(0, 140), time: null,
    },
  } as never);
  return true;
}

/** "Ask AI to find <text>" — resolve a typed name to a real venue, add it as an option. */
export async function addResolvedPlace(slug: string, query: string, slotKey: string, day: number): Promise<boolean> {
  const db = supabaseAdmin();
  const { planId } = await assertParticipant(slug);
  if (!query.trim()) return false;
  const { data: plan } = await db.from("plans").select("place_address").eq("id", planId).maybeSingle();
  const location = ((plan as Row | null)?.place_address as string) || "London, UK";
  const resolved = await resolvePlace(query, location);
  if (!resolved) return false;
  const { data: existing } = await db.from("plan_options").select("payload, title").eq("plan_id", planId);
  const allRows = (existing as Row[]) ?? [];
  const meta = readMeta(allRows);
  const { label, order } = slotMetaFrom(meta.scaffold, allRows, slotKey, day);
  await db.from("plan_options").insert({
    plan_id: planId, kind: "activity", source: "ai",
    title: resolved.title.slice(0, 140), subtitle: resolved.subtitle ?? null, why: resolved.why ?? null,
    source_url: mapsUrl(resolved.map_query) ?? null, source_label: "AI + Maps",
    payload: {
      slot: slotKey, slot_label: label, slot_order: order, day, fixed: false, chosen: false,
      tile: resolved.tile, place_name: resolved.place_name ?? resolved.title, time: null,
    },
  } as never);
  return true;
}

/** Remove a single option/suggestion from a plan (owner). */
export async function deleteOption(slug: string, optionId: string): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: planRow } = await db.from("plans").select("id").eq("slug", slug).maybeSingle();
  if (!planRow) throw new Error("plan not found");
  const planId = (planRow as Row).id as string;
  const { data: opt } = await db.from("plan_options").select("plan_id").eq("id", optionId).maybeSingle();
  // option must belong to THIS plan — stop an owner deleting another plan's option by id
  if (!opt || (opt as Row).plan_id !== planId) throw new Error("option not on this plan");
  await db.from("option_votes").delete().eq("option_id", optionId);
  await db.from("plan_options").delete().eq("id", optionId);
  await deriveHeadline(planId, slug);
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
  await assertOwner(slug);
  const db = supabaseAdmin();
  await db.from("plans").update({ place_address: location.slice(0, 200) } as never).eq("slug", slug);
}

/** Invite people: add as members + drop an invite + notification for each. */
export async function invitePeople(slug: string, profileIds: string[]): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: plan } = await db.from("plans").select("id, title, activity, cover_hue").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const p = plan as Row;
  const pid = p.id as string;
  // cap + dedupe the invite list so one call can't fan out unbounded rows
  profileIds = Array.from(new Set((profileIds ?? []).filter((id) => typeof id === "string"))).slice(0, 50);
  // Invitees start as "maybe" (tentative) — they only count as going once they
  // explicitly accept via setRsvp. Auto-"in" inflated availability + lock counts.
  const rows = profileIds.map((id) => ({ plan_id: pid, profile_id: id, rsvp: "maybe", joined_via: "app" }));
  if (!rows.length) return;
  await db.from("plan_members").upsert(rows as never, { onConflict: "plan_id,profile_id" } as never);

  const myName = await nameOf(me);
  const activity = (p.activity as string) || (p.title as string) || "a plan";
  const cover = deriveCover(p.cover_hue as string) ?? "/img/cover-hike.png";
  // one bulk insert per table instead of 2 round-trips per invitee
  await db.from("invites").insert(
    profileIds.map((id) => ({ to_id: id, from_id: me, from_label: myName, kind: "friend", activity, plan_slug: slug, cover })) as never,
  );
  await db.from("notifications").insert(
    profileIds.map((id) => ({ profile_id: id, text: `${myName} invited you to ${activity}`, kind: "invite", plan_slug: slug, acknowledged: false })) as never,
  );
}

/** Move a plan through its lifecycle: open → locked → completed. Owner only. */
// legal lifecycle moves — stops jumping open→completed or other illegal skips
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  open: ["open", "locked"],
  locked: ["locked", "open", "completed"],
  completed: ["completed", "locked"],
};

export async function updatePlanStatus(slug: string, status: "open" | "locked" | "completed"): Promise<void> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const { data: cur } = await db.from("plans").select("status").eq("slug", slug).maybeSingle();
  const from = ((cur as Row | null)?.status as string) ?? "open";
  if (!(LEGAL_TRANSITIONS[from] ?? []).includes(status))
    throw new Error(`can't move a ${from} plan to ${status}`);
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

// Resolve a slug → its core auth fields, or throw "plan not found".
async function planAuth(slug: string): Promise<{ id: string; creatorId: string; visibility: string }> {
  const db = supabaseAdmin();
  const { data } = await db.from("plans").select("id, creator_id, visibility").eq("slug", slug).maybeSingle();
  if (!data) throw new Error("plan not found");
  const r = data as Row;
  return { id: r.id as string, creatorId: (r.creator_id as string) ?? "", visibility: (r.visibility as string) ?? "invite" };
}

// True if `me` has a plan_members row on this plan.
async function isMember(planId: string, me: string): Promise<boolean> {
  if (!me) return false;
  const db = supabaseAdmin();
  const { data } = await db.from("plan_members").select("profile_id").eq("plan_id", planId).eq("profile_id", me).maybeSingle();
  return !!data;
}

/**
 * Guard participant actions (vote / propose options or dates). The caller must be
 * the owner, an existing member, or the plan must be open. Returns { planId, me }.
 */
async function assertParticipant(slug: string): Promise<{ planId: string; me: string }> {
  const me = await currentUserId();
  if (!me) throw new Error("sign in required");
  const p = await planAuth(slug);
  if (p.creatorId === me || p.visibility === "open" || (await isMember(p.id, me))) return { planId: p.id, me };
  throw new Error("not your plan");
}

// ---------- communities / events / nudges / invites / notifications ----------
export interface CommunityCard { id: string; name: string; tag: string; members: string }
export interface OpenEventCard { id: string; community: string; activity: string; place: string; dateLabel: string; cover: string; going: number; slug: string }
export interface NudgeCard { id: string; from: Profile; message: string; when: string }
export interface InviteCard { id: string; fromLabel: string; kind: string; activity: string; slug: string; dateLabel: string; cover: string }
export interface NotificationCard { id: string; text: string; when: string; slug?: string; kind?: string }

// Discovery (communities + open events) is DISABLED for now: the seed rows point at
// demo plans that don't exist as real DB plans, so their cards led to broken pages.
// Returning [] hides the surfaces; the query code below is kept for the real rebuild
// (when communities back onto real open-visibility plans). See PICKUP / issue #7.
export async function getCommunities(): Promise<CommunityCard[]> {
  return [];
  // const db = supabaseAdmin();
  // const { data } = await db.from("communities").select("*").order("created_at");
  // return ((data as Row[]) ?? []).map((c) => ({
  //   id: c.id as string, name: c.name as string, tag: (c.tag as string) ?? "", members: (c.members_label as string) ?? "0",
  // }));
}

export async function getOpenEvents(): Promise<OpenEventCard[]> {
  return [];
  // const db = supabaseAdmin();
  // const { data } = await db.from("open_events").select("*").order("created_at");
  // return ((data as Row[]) ?? []).map((e) => ({
  //   id: e.id as string, community: (e.community_name as string) ?? "", activity: e.activity as string,
  //   place: (e.place as string) ?? "", dateLabel: (e.date_label as string) ?? "", cover: (e.cover as string) ?? "/img/cover-park.png",
  //   going: (e.going as number) ?? 0, slug: (e.plan_slug as string) ?? "wild-otter-42",
  // }));
}

export const getNudges = cache(async (): Promise<NudgeCard[]> => {
  const db = supabaseAdmin();
  const { data } = await db.from("nudges").select("*, from:profiles!from_id(*)").eq("to_id", await currentUserId()).eq("status", "pending").order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((n) => ({
    id: n.id as string, from: mapProfile(n.from as Row) ?? ({ name: "Someone" } as Profile),
    message: n.message as string, when: (n.when_text as string) ?? "",
  }));
});

export const getInvites = cache(async (): Promise<InviteCard[]> => {
  const db = supabaseAdmin();
  const { data } = await db.from("invites").select("*").eq("to_id", await currentUserId()).order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((i) => ({
    id: i.id as string, fromLabel: (i.from_label as string) ?? "Someone", kind: (i.kind as string) ?? "friend",
    activity: (i.activity as string) ?? "", slug: (i.plan_slug as string) ?? "wild-otter-42",
    dateLabel: (i.date_label as string) ?? "", cover: (i.cover as string) ?? "/img/cover-hike.png",
  }));
});

export const getNotifications = cache(async (): Promise<NotificationCard[]> => {
  const db = supabaseAdmin();
  const { data } = await db.from("notifications").select("*").eq("profile_id", await currentUserId()).eq("acknowledged", false).order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map((n) => ({
    id: n.id as string, text: n.text as string, when: (n.when_text as string) ?? "",
    slug: (n.plan_slug as string) ?? undefined, kind: (n.kind as string) ?? undefined,
  }));
});

// ---------- writes: notifications, nudges, poke, mark-read ----------

/** Internal: drop a notification for a profile. */
// the acting/other user's display name for notification copy (one shared lookup)
async function nameOf(profileId: string, fallback = "A friend"): Promise<string> {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("name").eq("id", profileId).maybeSingle();
  return ((data as Row | null)?.name as string) || fallback;
}

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
/**
 * Send a nudge — just the intent, NO plan yet. The recipient accepts or declines;
 * only on accept is the shared plan created (see respondNudge).
 */
export async function sendNudge(toId: string, message: string, whenText: string): Promise<{ ok: true }> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  if (!me) throw new Error("sign in required");
  const myName = await nameOf(me);
  await db.from("nudges").insert({ from_id: me, to_id: toId, message: message ?? null, when_text: whenText, status: "pending" } as never);
  const detail = message?.trim() ? ` — "${message.trim()}"` : "";
  await notify(toId, `${myName} nudged you${detail}. Up for it?`, "nudge", null);
  return { ok: true };
}

/**
 * Recipient responds to a nudge. Accept → create the shared blank plan (both
 * members), notify the sender, return its slug. Decline → notify the sender.
 */
export async function respondNudge(nudgeId: string, accept: boolean): Promise<{ slug: string | null }> {
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: nRow } = await db.from("nudges").select("*").eq("id", nudgeId).maybeSingle();
  if (!nRow) throw new Error("nudge not found");
  const nudge = nRow as Row;
  if ((nudge.to_id as string) !== me) throw new Error("not your nudge");
  // idempotent: a replayed accept must NOT create a second shared plan
  if ((nudge.status as string) !== "pending") return { slug: null };
  const fromId = nudge.from_id as string;
  const message = (nudge.message as string) || "";
  const myName = await nameOf(me, "Someone");
  const fromName = await nameOf(fromId, "A friend");

  if (!accept) {
    await db.from("nudges").update({ status: "declined" } as never).eq("id", nudgeId);
    await notify(fromId, `${myName} passed on your nudge this time.`, "nudge_declined", null);
    return { slug: null };
  }

  // accepted → create the shared blank plan both can build
  const slug = planSlug(`${Date.now()}-nudge`);
  const { data: plan } = await db.from("plans").insert({
    slug,
    // default name = the two people involved (e.g. "Josh & Conor"). Holds until they
    // commit to a venue (deriveHeadline overrides on choose) or rename it manually.
    // The nudge message becomes the intent (drives the AI build), not the title.
    title: `${fromName} & ${myName}`.slice(0, 140),
    intent: message || null,
    status: "open",
    visibility: "invite",
    creator_id: fromId, // the nudger started it — they own it
    ai_empowered: true,
    cover_hue: "city",
  } as never).select("id").single();
  const planId = (plan as unknown as Row | null)?.id as string;
  if (planId) {
    await db.from("plan_members").upsert([
      { plan_id: planId, profile_id: fromId, rsvp: "in", joined_via: "app" },
      { plan_id: planId, profile_id: me, rsvp: "in", joined_via: "app" },
    ] as never, { onConflict: "plan_id,profile_id" } as never);
    await writeMeta(planId, { scaffold: [{ key: "plan", label: "What shall we do?", day: 1, order: 0 }] });
  }
  await db.from("nudges").update({ status: "accepted" } as never).eq("id", nudgeId);
  await notify(fromId, `${myName} is KEEN — let's go! Tap to start planning together.`, "nudge_accepted", slug);
  return { slug };
}

/** Poke everyone invited to a plan who hasn't picked/voted yet. Owner action. */
export async function pokeNonVoters(slug: string): Promise<number> {
  await assertOwner(slug);
  const db = supabaseAdmin();
  const me = await currentUserId();
  const { data: plan } = await db.from("plans").select("id, title").eq("slug", slug).maybeSingle();
  if (!plan) return 0;
  const planId = (plan as Row).id as string;
  const myName = await nameOf(me, "Someone");
  const { data: members } = await db.from("plan_members").select("profile_id").eq("plan_id", planId);
  const others = ((members as Row[]) ?? []).map((m) => m.profile_id as string).filter((id) => id !== me);
  if (!others.length) return 0;
  const text = `${myName} poked you to weigh in on "${(plan as Row).title as string}"`;
  await db.from("notifications").insert(
    others.map((id) => ({ profile_id: id, text, kind: "poke", plan_slug: slug, acknowledged: false })) as never,
  );
  return others.length;
}
