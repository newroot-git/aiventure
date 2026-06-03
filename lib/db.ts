import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { generateDrop, mapsUrl, type DropInput } from "./ai";
import { planSlug } from "./slug";
import type { Plan, PlanOption, PlanMember, Profile, Adventure, Activity } from "./types";

// Demo identity (stands in for auth) — the seeded "Josh" profile.
export const DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";

const COVERS: Record<string, string> = {
  hike: "/img/cover-hike.png",
  pub: "/img/cover-pub.png",
  climb: "/img/cover-climb.png",
  park: "/img/cover-park.png",
  gig: "/img/cover-gig.png",
};
// cover_hue stores a tile key for AI-generated plans → map to a cover image
function deriveCover(hue?: string | null): string | null {
  if (!hue) return null;
  return COVERS[hue] ?? `/img/tiles/${hue}.png`;
}

/** Generate options via the AI agent, persist the plan + options, return its slug. */
export async function createPlanFromDrop(input: DropInput): Promise<{ slug: string }> {
  const drop = await generateDrop({ ...input, scope: "single" });
  const options = drop.options ?? [];
  const slug = planSlug(`${Date.now()}-${input.intent}`);
  const db = supabaseAdmin();

  const { data: plan, error } = await db
    .from("plans")
    .insert({
      slug,
      title: input.intent.slice(0, 140),
      intent: input.intent,
      status: "open",
      visibility: "invite",
      creator_id: DEMO_USER_ID,
      ai_empowered: true,
      cover_hue: options[0]?.tile ?? "city",
      place_address: input.location ?? null, // stash search location for later refine
    } as never)
    .select("id")
    .single();
  if (error || !plan) throw new Error(error?.message ?? "insert plan failed");

  if (options.length) {
    const rows = options.map((o) => ({
      plan_id: (plan as { id: string }).id,
      kind: "activity",
      source: "ai",
      title: o.title,
      subtitle: o.subtitle ?? null,
      why: o.why ?? null,
      source_url: mapsUrl(o.map_query) ?? null,
      source_label: "AI + Maps",
      payload: { tile: o.tile, place_name: o.place_name ?? null },
    }));
    const { error: e2 } = await db.from("plan_options").insert(rows as never);
    if (e2) throw new Error(e2.message);
  }
  return { slug };
}

/** Load a persisted plan + its options + members by slug (null if not found). */
export async function getPlanBySlug(slug: string): Promise<{
  plan: Plan;
  options: PlanOption[];
  members: PlanMember[];
} | null> {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("*").eq("slug", slug).maybeSingle();
  if (!plan) return null;

  const row = plan as Record<string, unknown>;
  const { data: options } = await db
    .from("plan_options")
    .select("*")
    .eq("plan_id", row.id as string)
    .order("created_at");
  const { data: members } = await db
    .from("plan_members")
    .select("*, profile:profiles(*)")
    .eq("plan_id", row.id as string);

  return {
    plan: {
      ...(row as unknown as Plan),
      key_info: (row.key_info as Plan["key_info"]) ?? [],
      cover_url: deriveCover(row.cover_hue as string | null),
    },
    options: (options ?? []) as unknown as PlanOption[],
    members: ((members ?? []) as Record<string, unknown>[]).map((m) => ({
      ...m,
      profile: mapProfile(m.profile as Record<string, unknown>),
    })) as unknown as PlanMember[],
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
  slug: string; activity: string; dateLabel: string; date: string; place: string;
  groupName: string; members: Profile[]; status: "upcoming" | "past"; adventureNo?: number;
  cover: string; tile: string;
}

function mapPlanCard(r: Row): PlanCard {
  const members = ((r.plan_members as Row[]) ?? [])
    .map((m) => mapProfile(m.profile as Row))
    .filter((p): p is Profile => !!p);
  const hue = (r.cover_hue as string) || "city";
  return {
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
  return ((data as Row[]) ?? []).map(mapPlanCard);
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

/** Regenerate a plan's options, optionally steered by free-text feedback. */
export async function refinePlanOptions(slug: string, feedback?: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id, intent, place_address").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const row = plan as Row;
  const intent = (row.intent as string) || "something good";
  const location = (row.place_address as string) || "London, UK";
  const steered = feedback?.trim() ? `${intent}. Important preference: ${feedback.trim()}` : intent;

  const drop = await generateDrop({ scope: "single", intent: steered, location });
  const options = drop.options ?? [];
  await db.from("plan_options").delete().eq("plan_id", row.id as string);
  if (options.length) {
    const rows = options.map((o) => ({
      plan_id: row.id as string, kind: "activity", source: "ai",
      title: o.title, subtitle: o.subtitle ?? null, why: o.why ?? null,
      source_url: mapsUrl(o.map_query) ?? null, source_label: "AI + Maps",
      payload: { tile: o.tile, place_name: o.place_name ?? null },
    }));
    await db.from("plan_options").insert(rows as never);
  }
}

/** Smart-resolve a typed place into a real venue and add it as an option. */
export async function addCustomOption(slug: string, query: string): Promise<boolean> {
  const { resolvePlace } = await import("./ai");
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("id, place_address").eq("slug", slug).maybeSingle();
  if (!plan) throw new Error("plan not found");
  const row = plan as Row;
  const resolved = await resolvePlace(query, (row.place_address as string) || "London, UK");
  if (!resolved) return false;
  await db.from("plan_options").insert({
    plan_id: row.id as string, kind: "activity", source: "human",
    title: resolved.title, subtitle: resolved.subtitle ?? null, why: resolved.why ?? null,
    source_url: mapsUrl(resolved.map_query) ?? null, source_label: "Added",
    payload: { tile: resolved.tile, place_name: resolved.place_name ?? null },
  } as never);
  return true;
}

/** Move a plan through its lifecycle: open (planning) → locked → completed. */
export async function updatePlanStatus(slug: string, status: "open" | "locked" | "completed"): Promise<void> {
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = { status };
  patch.completed_at = status === "completed" ? new Date().toISOString() : null;
  const { error } = await db.from("plans").update(patch as never).eq("slug", slug);
  if (error) throw new Error(error.message);
}

// ---------- adventures (multi-activity) — stored as a plan + activity-options ----------
export interface AdventureInput {
  intent: string;
  scope: "adventure" | "trip";
  who?: string;
  nights?: number;
  activities: {
    title: string; subtitle?: string; time?: string; day?: number;
    place_name?: string; map_query?: string; why?: string; tile: string;
  }[];
}

export async function createAdventure(input: AdventureInput): Promise<{ slug: string }> {
  const db = supabaseAdmin();
  const acts = input.activities ?? [];
  const slug = planSlug(`${Date.now()}-${input.intent}-adv`);
  const { data: plan, error } = await db
    .from("plans")
    .insert({
      slug,
      title: input.intent.slice(0, 140),
      intent: input.intent,
      status: "open",
      visibility: "group",
      creator_id: DEMO_USER_ID,
      ai_empowered: true,
      cover_hue: acts[0]?.tile ?? "trip",
    } as never)
    .select("id")
    .single();
  if (error || !plan) throw new Error(error?.message ?? "insert adventure failed");

  if (acts.length) {
    const rows = acts.map((a, i) => ({
      plan_id: (plan as { id: string }).id,
      kind: "activity",
      source: "ai",
      title: a.title,
      subtitle: a.subtitle ?? null,
      why: a.why ?? null,
      source_url: mapsUrl(a.map_query || a.place_name) ?? null,
      source_label: "AI + Maps",
      payload: { time: a.time ?? null, day: a.day ?? 1, tile: a.tile, place_name: a.place_name ?? null, order: i },
    }));
    const { error: e2 } = await db.from("plan_options").insert(rows as never);
    if (e2) throw new Error(e2.message);
  }
  return { slug };
}

export async function getAdventureBySlug(slug: string): Promise<Adventure | null> {
  const db = supabaseAdmin();
  const { data: plan } = await db.from("plans").select("*").eq("slug", slug).maybeSingle();
  if (!plan) return null;
  const row = plan as Row;
  const { data: opts } = await db.from("plan_options").select("*").eq("plan_id", row.id as string).order("created_at");

  const activities: Activity[] = ((opts as Row[]) ?? []).map((o) => {
    const p = (o.payload as Row) ?? {};
    return {
      id: o.id as string,
      title: o.title as string,
      subtitle: (o.subtitle as string) ?? undefined,
      time: (p.time as string) ?? undefined,
      day: (p.day as number) ?? 1,
      place_name: (p.place_name as string) ?? undefined,
      why: (o.why as string) ?? undefined,
      source_label: (o.source_label as string) ?? undefined,
      source_url: (o.source_url as string) ?? undefined,
      tile: (p.tile as string) ?? "city",
    };
  });
  const days = Math.max(1, ...activities.map((a) => a.day ?? 1));
  return {
    slug: row.slug as string,
    title: (row.activity as string) || (row.title as string),
    scope: days > 1 ? "trip" : "adventure",
    days,
    who: "Your crew",
    cover: deriveCover(row.cover_hue as string) || "/img/cover-hike.png",
    ai_empowered: true,
    members: [],
    activities,
  };
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
