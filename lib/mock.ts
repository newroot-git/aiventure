import type { Plan, PlanOption, PlanMember, Profile, Group, Adventure, Activity } from "./types";

// Mock data so the app renders before Supabase/AI keys are wired. No emojis anywhere.
const AVATAR_MAP: Record<string, string> = {
  Josh: "/img/avatars/a1.png",
  Conor: "/img/avatars/a2.png",
  Jack: "/img/avatars/a3.png",
  Sam: "/img/avatars/a4.png",
  Mia: "/img/avatars/a5.png",
  Tom: "/img/avatars/a6.png",
  Priya: "/img/avatars/a9.png",
};
function mkProfile(name: string, paid = false): Profile {
  return {
    id: name.toLowerCase(),
    auth_id: null,
    name,
    email: null,
    avatar: AVATAR_MAP[name] ?? null,
    interests: [],
    interest_notes: null,
    is_paid: paid,
    created_at: "",
  };
}

const josh = mkProfile("Josh", true);
const conor = mkProfile("Conor");
const jack = mkProfile("Jack");
const sam = mkProfile("Sam");

export const CURRENT_USER: Profile = {
  ...josh,
  interests: ["Hiking", "Craft beer", "Climbing", "Live music", "Photography"],
  interest_notes: "Always up for the outdoors. Card-only pubs welcome. Will travel up to ~2hrs.",
};

const people = [josh, conor, jack, sam];

export const MOCK_GROUPS: (Group & { members: Profile[] })[] = [
  { id: "the-boys", name: "The boys", emoji: "", owner_id: "josh", created_at: "", members: people },
  { id: "climbing-crew", name: "Climbing crew", emoji: "", owner_id: "josh", created_at: "", members: [josh, sam, mkProfile("Mia")] },
];

export const MOCK_PLAN: Plan = {
  id: "mock",
  slug: "wild-otter-42",
  title: "Something with the boys, Saturday",
  intent: "something with the boys saturday afternoon, under £40, outdoorsy",
  status: "open",
  visibility: "group",
  creator_id: "josh",
  group_id: "the-boys",
  interest_filter: [],
  ai_empowered: true,
  activity: "Sunset hike on Hampstead Heath, then craft beer",
  starts_at: "2026-06-06T16:00:00.000Z",
  place_name: "Parliament Hill, Hampstead Heath",
  place_address: "Hampstead Heath, London NW5",
  place_lat: 51.5608,
  place_lng: -0.1527,
  place_url: "https://www.google.com/maps?q=Parliament+Hill+Hampstead+Heath",
  why: "You all rate the outdoors and haven't done a proper hike in a while — and there's a great craft-beer pub a 7-minute walk from the trail head.",
  key_info: [
    { label: "Trainers are fine, the trail's easy" },
    { label: "Bring water" },
    { label: "Sunset around 21:15 — head up by 20:30" },
    { label: "The pub is card-only" },
  ],
  cover_hue: "primary",
  cover_url: "/img/cover-hike.png",
  adventure_no: null,
  created_at: "",
  completed_at: null,
};

export const MOCK_OPTIONS: PlanOption[] = [
  {
    id: "o1", plan_id: "mock", kind: "activity", source: "ai",
    title: "Sunset hike on Hampstead Heath",
    subtitle: "Parliament Hill viewpoint · easy 4km loop",
    why: "Best free view in London at golden hour, and it's a 20-minute walk from everyone.",
    image_url: null,
    source_url: "https://www.google.com/maps?q=Parliament+Hill+Hampstead+Heath",
    source_label: "Google Places", payload: {}, suggested_by: null, votes: 3, created_at: "",
  },
  {
    id: "o2", plan_id: "mock", kind: "activity", source: "ai",
    title: "The Southampton Arms — craft beer and pies",
    subtitle: "Cask ale pub · ~£6/pint · 7-min walk from the Heath",
    why: "Card-only proper boozer, no-frills, exactly your kind of place to land after the walk.",
    image_url: null,
    source_url: "https://www.google.com/maps?q=The+Southampton+Arms+London",
    source_label: "Google Places", payload: {}, suggested_by: null, votes: 2, created_at: "",
  },
  {
    id: "o3", plan_id: "mock", kind: "activity", source: "ai",
    title: "Or: open-air gig at the Bandstand",
    subtitle: "Live music on the Heath · free entry · Sat 5pm",
    why: "If you fancy something different — there's actually live music on this weekend.",
    image_url: null,
    source_url: "https://www.ticketmaster.co.uk",
    source_label: "Ticketmaster", payload: {}, suggested_by: null, votes: 0, created_at: "",
  },
];

export const MOCK_MEMBERS: PlanMember[] = people.map((p, i) => ({
  plan_id: "mock",
  profile_id: p.id,
  rsvp: i === 3 ? "maybe" : "in",
  joined_via: "app",
  notify_email: null,
  created_at: "",
  profile: p,
}));

export const MOCK_PEOPLE = people;

// Summaries for the "My plans" list
export interface PlanSummary {
  slug: string;
  activity: string;
  dateLabel: string;
  date: string; // ISO yyyy-mm-dd for the calendar
  place: string;
  groupName: string;
  members: Profile[];
  status: "upcoming" | "past";
  adventureNo?: number;
  cover: string;
  tile: string;
}

export const MOCK_PLANS: PlanSummary[] = [
  {
    slug: "wild-otter-42",
    activity: "Sunset hike on Hampstead Heath, then craft beer",
    dateLabel: "Sat 6 June · 16:00",
    date: "2026-06-06",
    place: "Hampstead Heath",
    groupName: "The boys",
    members: people,
    status: "upcoming",
    cover: "/img/cover-hike.png",
    tile: "hike",
  },
  {
    slug: "golden-ridge-18",
    activity: "Sunday roast and a long walk",
    dateLabel: "Sun 31 May",
    date: "2026-05-31",
    place: "Richmond Park",
    groupName: "The boys",
    members: [josh, conor, jack],
    status: "past",
    adventureNo: 3,
    cover: "/img/cover-park.png",
    tile: "park",
  },
  {
    slug: "brave-comet-27",
    activity: "Indoor bouldering session",
    dateLabel: "Wed 27 May",
    date: "2026-05-27",
    place: "The Castle Climbing Centre",
    groupName: "Climbing crew",
    members: [josh, sam],
    status: "past",
    adventureNo: 2,
    cover: "/img/cover-climb.png",
    tile: "climb",
  },
  {
    slug: "amber-fjord-09", activity: "Climbing then pizza", dateLabel: "Sat 18 April",
    date: "2026-04-18", place: "Stronghold, Tottenham", groupName: "Climbing crew",
    members: [josh, sam], status: "past", adventureNo: 1, cover: "/img/cover-climb.png", tile: "climb",
  },
  {
    slug: "mellow-glade-31", activity: "Beach day in Brighton", dateLabel: "Sun 5 April",
    date: "2026-04-05", place: "Brighton", groupName: "The boys",
    members: people, status: "past", cover: "/img/cover-park.png", tile: "beach",
  },
  {
    slug: "rugged-ridge-12", activity: "Pub quiz night", dateLabel: "Thu 20 March",
    date: "2026-03-20", place: "The Old Crown", groupName: "The boys",
    members: [josh, conor, jack], status: "past", cover: "/img/cover-pub.png", tile: "games",
  },
];

// Social feed — friends' finished adventures
export interface FeedItem {
  id: string;
  person: Profile;
  activity: string;
  place: string;
  dateLabel: string;
  cover: string;
  members: Profile[];
  likes: number;
}

export const MOCK_FEED: FeedItem[] = [
  {
    id: "f1", person: conor, activity: "Bouldering then burritos",
    place: "The Castle, Stoke Newington", dateLabel: "2 days ago",
    cover: "/img/cover-climb.png", members: [conor, sam], likes: 7,
  },
  {
    id: "f2", person: jack, activity: "Open-air gig on the Heath",
    place: "Hampstead Heath", dateLabel: "5 days ago",
    cover: "/img/cover-gig.png", members: [jack, josh, conor], likes: 12,
  },
  {
    id: "f3", person: sam, activity: "Sunday roast and a long walk",
    place: "Richmond Park", dateLabel: "1 week ago",
    cover: "/img/cover-park.png", members: [sam, josh, jack], likes: 9,
  },
];

// Invites inbox
export interface Invite {
  id: string;
  from: Profile;
  kind: "friend" | "community";
  fromLabel: string;
  activity: string;
  slug: string;
  dateLabel: string;
  cover: string;
}

export const MOCK_INVITES: Invite[] = [
  {
    id: "i1", from: conor, kind: "friend", fromLabel: "Conor",
    activity: "Sunset hike on Hampstead Heath, then craft beer",
    slug: "wild-otter-42", dateLabel: "Sat 6 June · 16:00", cover: "/img/cover-hike.png",
  },
  {
    id: "i2", from: mkProfile("Mia"), kind: "community", fromLabel: "City Boulderers",
    activity: "Thursday night bouldering social",
    slug: "wild-otter-42", dateLabel: "Thu 11 June · 19:00", cover: "/img/cover-climb.png",
  },
];

export const MOCK_ADVENTURE: Adventure = {
  slug: "epic-saturday",
  title: "Epic Saturday with the boys",
  scope: "adventure",
  days: 1,
  who: "The boys",
  cover: "/img/cover-hike.png",
  ai_empowered: true,
  members: people,
  activities: [
    { id: "a1", title: "Brunch at Dishoom", time: "11:00", day: 1, place_name: "Dishoom, Shoreditch", why: "Hearty start — everyone rates a bacon naan roll.", source_label: "Google Places", tile: "food" },
    { id: "a2", title: "Sunset hike on Hampstead Heath", time: "15:00", day: 1, place_name: "Parliament Hill", why: "Best free view in London at golden hour.", source_label: "Google Places", tile: "hike" },
    { id: "a3", title: "Craft beer at The Southampton Arms", time: "18:00", day: 1, place_name: "Highgate Rd", why: "Card-only proper boozer, 7 min from the Heath.", source_label: "Google Places", tile: "pub" },
  ],
};

// pool the "AI build it" button draws from (mock generation)
export const AI_ACTIVITY_POOL: Activity[] = [
  { id: "p1", title: "Coffee at Prufrock", time: "10:00", place_name: "Leather Lane", why: "Proper flat whites to kick off.", source_label: "Google Places", tile: "coffee" },
  { id: "p2", title: "Bouldering at The Castle", time: "12:30", place_name: "Stoke Newington", why: "Beginner-friendly walls, you all rate climbing.", source_label: "Google Places", tile: "climb" },
  { id: "p3", title: "Street food at Mercato", time: "14:30", place_name: "Mayfair", why: "Loads of options, no one has to agree.", source_label: "Google Places", tile: "food" },
  { id: "p4", title: "Open-air gig on the Heath", time: "17:00", place_name: "Hampstead Heath", why: "Live music on this weekend, free entry.", source_label: "Ticketmaster", tile: "gig" },
  { id: "p5", title: "Sunday roast at The Bull", time: "19:30", place_name: "Highgate", why: "Cap the day with a proper roast.", source_label: "Google Places", tile: "park" },
];

// ---- Friends, nudges, communities, open plans ----
function friend(name: string, interests: string[]): Profile {
  return { ...mkProfile(name), interests };
}
export const MOCK_FRIENDS: Profile[] = [
  friend("Conor", ["Gaming", "Craft beer", "Board games"]),
  friend("Jack", ["Live music", "Craft beer", "Film"]),
  friend("Sam", ["Climbing", "Hiking", "Coffee"]),
  friend("Mia", ["Climbing", "Yoga", "Surfing"]),
  friend("Tom", ["Golf", "Food", "Wine"]),
  friend("Priya", ["Running", "Photography", "Travel"]),
];

// groups the current user shares with a friend
export function sharedGroups(friendId: string): string[] {
  return MOCK_GROUPS.filter(
    (g) => g.members.some((m) => m.id === "josh") && g.members.some((m) => m.id === friendId),
  ).map((g) => g.name);
}

// real notifications (beyond invites/nudges)
export interface AppNotification {
  id: string;
  text: string;
  when: string;
  slug?: string;
}
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "nt1", text: "Conor is in for the Sunset hike", when: "1h", slug: "wild-otter-42" },
  { id: "nt2", text: "Your hike moved to 16:00", when: "3h", slug: "wild-otter-42" },
  { id: "nt3", text: "Hike is in 3 days — RSVP closes soon", when: "5h", slug: "wild-otter-42" },
];

export interface Nudge {
  id: string;
  from: Profile;
  message: string;
  when: string;
  status: "pending";
}
export const MOCK_NUDGES: Nudge[] = [
  { id: "n1", from: conor, message: "Wants to do something this weekend", when: "This weekend", status: "pending" },
  { id: "n2", from: mkProfile("Mia"), message: "Up for a climb sometime soon?", when: "This week", status: "pending" },
];

export interface Community {
  id: string;
  name: string;
  members: string;
  tag: string;
}
export const MOCK_COMMUNITIES: Community[] = [
  { id: "c1", name: "London Trail Runners", members: "1.2k", tag: "Running" },
  { id: "c2", name: "City Boulderers", members: "840", tag: "Climbing" },
  { id: "c3", name: "Board Game Nights", members: "610", tag: "Games" },
];

export interface OpenPlan {
  id: string;
  activity: string;
  place: string;
  dateLabel: string;
  community: string;
  cover: string;
  going: number;
  slug: string;
}
export const MOCK_OPEN: OpenPlan[] = [
  { id: "op1", activity: "Thursday night bouldering social", place: "The Castle", dateLabel: "Thu 11 June · 19:00", community: "City Boulderers", cover: "/img/cover-climb.png", going: 14, slug: "wild-otter-42" },
  { id: "op2", activity: "Sunset 10k along the canal", place: "Regent's Canal", dateLabel: "Sat 13 June · 18:00", community: "London Trail Runners", cover: "/img/cover-park.png", going: 31, slug: "wild-otter-42" },
];
