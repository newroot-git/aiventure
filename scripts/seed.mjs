// Seed AIventure's Supabase with rich demo data (profiles, groups, plans).
// Idempotent: upserts profiles/groups, replaces demo plans by slug.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
async function rest(method, path, body, prefer) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

// fixed UUIDs so relationships link across runs
const U = {
  josh: "11111111-1111-1111-1111-111111111111",
  conor: "22222222-2222-2222-2222-222222222222",
  jack: "33333333-3333-3333-3333-333333333333",
  sam: "44444444-4444-4444-4444-444444444444",
  mia: "55555555-5555-5555-5555-555555555555",
  tom: "66666666-6666-6666-6666-666666666666",
  priya: "77777777-7777-7777-7777-777777777777",
  boys: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  climb: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
};

const profiles = [
  { id: U.josh, name: "Josh", avatar: "/img/avatars/a1.png", is_paid: true, interests: ["Hiking", "Craft beer", "Climbing", "Live music", "Photography"], interest_notes: "Always up for the outdoors. Will travel ~2hrs." },
  { id: U.conor, name: "Conor", avatar: "/img/avatars/a2.png", interests: ["Gaming", "Craft beer", "Board games"] },
  { id: U.jack, name: "Jack", avatar: "/img/avatars/a3.png", interests: ["Live music", "Craft beer", "Film"] },
  { id: U.sam, name: "Sam", avatar: "/img/avatars/a4.png", interests: ["Climbing", "Hiking", "Coffee"] },
  { id: U.mia, name: "Mia", avatar: "/img/avatars/a5.png", interests: ["Climbing", "Yoga", "Surfing"] },
  { id: U.tom, name: "Tom", avatar: "/img/avatars/a6.png", interests: ["Golf", "Food", "Wine"] },
  { id: U.priya, name: "Priya", avatar: "/img/avatars/a9.png", interests: ["Running", "Photography", "Travel"] },
];

const groups = [
  { id: U.boys, name: "The boys", owner_id: U.josh },
  { id: U.climb, name: "Climbing crew", owner_id: U.josh },
];
const groupMembers = [
  ...[U.josh, U.conor, U.jack, U.sam].map((p) => ({ group_id: U.boys, profile_id: p, role: p === U.josh ? "owner" : "member" })),
  ...[U.josh, U.sam, U.mia].map((p) => ({ group_id: U.climb, profile_id: p, role: p === U.josh ? "owner" : "member" })),
];

const plans = [
  {
    slug: "wild-otter-42", title: "Something with the boys, Saturday",
    intent: "something outdoorsy with the boys saturday", status: "open", visibility: "group",
    creator_id: U.josh, group_id: U.boys, ai_empowered: true,
    activity: "Sunset hike on Hampstead Heath, then craft beer",
    starts_at: "2026-06-06T16:00:00Z", place_name: "Parliament Hill, Hampstead Heath",
    place_address: "Hampstead Heath, London NW5", place_lat: 51.5608, place_lng: -0.1527,
    why: "You all rate the outdoors and there's a great craft-beer pub by the trail head.",
    key_info: [{ label: "Bring water" }, { label: "Sunset ~21:15" }, { label: "Pub is card-only" }],
    cover_hue: "hike",
    members: [U.josh, U.conor, U.jack, U.sam], rsvps: { [U.sam]: "maybe" },
    options: [
      { title: "Sunset hike on Hampstead Heath", subtitle: "Parliament Hill · easy 4km", why: "Best free view in London at golden hour.", tile: "hike", votes: 3 },
      { title: "The Southampton Arms — craft beer", subtitle: "Cask ale pub · ~£6/pint", why: "Card-only proper boozer, 7 min from the Heath.", tile: "pub", votes: 2 },
    ],
  },
  {
    slug: "golden-ridge-18", title: "Sunday roast and a long walk",
    intent: "sunday roast + walk", status: "completed", visibility: "group",
    creator_id: U.josh, group_id: U.boys, activity: "Sunday roast and a long walk",
    starts_at: "2026-05-31T13:00:00Z", completed_at: "2026-05-31T18:00:00Z", adventure_no: 3,
    place_name: "Richmond Park", cover_hue: "park", members: [U.josh, U.conor, U.jack],
  },
  {
    slug: "brave-comet-27", title: "Indoor bouldering session",
    intent: "bouldering", status: "completed", visibility: "group",
    creator_id: U.josh, group_id: U.climb, activity: "Indoor bouldering session",
    starts_at: "2026-05-27T18:00:00Z", completed_at: "2026-05-27T21:00:00Z", adventure_no: 2,
    place_name: "The Castle Climbing Centre", cover_hue: "climb", members: [U.josh, U.sam],
  },
];

async function main() {
  console.log("profiles…");
  const profilesN = profiles.map((p) => ({
    id: p.id, name: p.name, avatar_emoji: p.avatar, is_paid: p.is_paid ?? false,
    interests: p.interests ?? [], interest_notes: p.interest_notes ?? null,
  }));
  await rest("POST", "profiles", profilesN, "resolution=merge-duplicates");
  console.log("groups…");
  await rest("POST", "groups", groups, "resolution=merge-duplicates");
  await rest("POST", "group_members", groupMembers, "resolution=merge-duplicates");

  for (const p of plans) {
    const { members, rsvps = {}, options = [], ...row } = p;
    // replace by slug
    await rest("DELETE", `plans?slug=eq.${p.slug}`);
    const [created] = await rest("POST", "plans", [row], "return=representation");
    const planId = created.id;
    if (members?.length) {
      await rest("POST", "plan_members", members.map((m) => ({
        plan_id: planId, profile_id: m, rsvp: rsvps[m] || "in", joined_via: "app",
      })), "resolution=merge-duplicates");
    }
    if (options?.length) {
      await rest("POST", "plan_options", options.map((o) => ({
        plan_id: planId, kind: "activity", source: "ai", title: o.title, subtitle: o.subtitle,
        why: o.why, source_label: "Google Places", votes: o.votes || 0, payload: { tile: o.tile },
      })));
    }
    console.log("plan:", p.slug);
  }
  console.log("DONE");
}
main().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
