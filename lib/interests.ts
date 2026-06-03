// Structured interest taxonomy — setting (indoor/outdoor) → categories → specifics.
// Lets onboarding go broad→specific and lets plans filter by category.

export type Setting = "outdoor" | "indoor" | "both";

export const SETTINGS: { id: Setting; label: string; desc: string }[] = [
  { id: "outdoor", label: "Outdoors", desc: "Fresh air, trails, the open" },
  { id: "indoor", label: "Indoors", desc: "Cosy spots, screens, tables" },
  { id: "both", label: "A bit of both", desc: "Depends on the day" },
];

export interface Category {
  id: string;
  label: string;
  setting: Setting;
  interests: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: "active",
    label: "Outdoors & active",
    setting: "outdoor",
    interests: ["Hiking", "Trail running", "Climbing", "Cycling", "Surfing", "Camping", "Kayaking", "Golf", "Wild swimming"],
  },
  {
    id: "food",
    label: "Food & drink",
    setting: "both",
    interests: ["Craft beer", "Coffee", "Wine", "Cooking", "Eating out", "Brunch", "Cocktails", "BBQ"],
  },
  {
    id: "games",
    label: "Games & play",
    setting: "indoor",
    interests: ["Board games", "Video games", "D&D / tabletop", "Pub quiz", "Darts & pool", "Arcade", "Card games"],
  },
  {
    id: "culture",
    label: "Culture & arts",
    setting: "both",
    interests: ["Film", "Live music", "Gigs", "Theatre", "Galleries", "Museums", "Comedy", "Photography"],
  },
  {
    id: "nightlife",
    label: "Nightlife & social",
    setting: "both",
    interests: ["Bars", "Clubbing", "House parties", "Festivals", "Karaoke"],
  },
  {
    id: "trips",
    label: "Trips & travel",
    setting: "outdoor",
    interests: ["Road trips", "City breaks", "Weekenders", "Beach days", "Camping trips"],
  },
  {
    id: "chill",
    label: "Chill & wellness",
    setting: "indoor",
    interests: ["Walks", "Picnics", "Cafés", "Yoga", "Spa", "Reading"],
  },
];

// categories visible for a given setting (outdoor hides indoor-only, etc.)
export function categoriesFor(setting: Setting): Category[] {
  if (setting === "both") return CATEGORIES;
  return CATEGORIES.filter((c) => c.setting === setting || c.setting === "both");
}

// large searchable database of things to do (beyond the curated category chips)
export const ALL_INTERESTS: string[] = Array.from(
  new Set([
    ...CATEGORIES.flatMap((c) => c.interests),
    // outdoors / active
    "Bouldering", "Mountain biking", "Road cycling", "Skateboarding", "Rollerblading",
    "Bird watching", "Fishing", "Paddleboarding", "Sailing", "Scuba diving", "Snorkelling",
    "Skiing", "Snowboarding", "Surfing", "Foraging", "Geocaching", "Orienteering",
    "Park run", "Football", "Five-a-side", "Basketball", "Tennis", "Padel", "Squash",
    "Badminton", "Volleyball", "Cricket", "Rugby", "Frisbee", "Bouldering gym",
    // food & drink
    "Street food", "Food markets", "Sunday roast", "Pizza", "Ramen", "Tacos", "Sushi",
    "Whisky tasting", "Gin tasting", "Beer festival", "Cheese & wine", "Bottomless brunch",
    "Coffee crawl", "Baking", "Supper clubs", "Pub lunch", "Afternoon tea",
    // games & play
    "Bowling", "Mini golf", "Crazy golf", "Escape rooms", "Laser tag", "Go-karting",
    "Axe throwing", "Pinball", "Retro arcade", "Chess", "Poker night", "Mahjong",
    "Warhammer", "Magic: The Gathering", "Trivia night", "Karaoke", "Bingo",
    // culture & arts
    "Cinema", "Open-air cinema", "Stand-up comedy", "Improv", "Jazz", "Open mic",
    "Art galleries", "Street art tour", "Pottery", "Life drawing", "Vinyl shopping",
    "Bookshop crawl", "Poetry", "Museums", "Exhibitions", "Film festival",
    // nightlife & social
    "Cocktail bars", "Wine bars", "Rooftop bars", "Pub crawl", "Dancing", "Silent disco",
    "Speakeasies", "Live DJ sets",
    // chill / wellness / trips
    "Picnic in the park", "Beach day", "Spa day", "Sauna", "Cold-water swimming",
    "Stargazing", "Camping", "Glamping", "Road trip", "City break", "Day trip",
    "Hot springs", "Botanical gardens", "Farmers market", "Vintage shopping",
  ]),
);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function subseq(q: string, s: string) {
  let i = 0;
  for (const ch of s) if (ch === q[i]) i++;
  return i === q.length;
}

// typo-tolerant search: exact-contains first, then subsequence (handles dropped letters)
export function searchInterests(query: string, exclude: string[] = []): string[] {
  const q = norm(query);
  if (!q) return [];
  const ex = new Set(exclude);
  const pool = ALL_INTERESTS.filter((i) => !ex.has(i));
  const contains = pool.filter((i) => norm(i).includes(q));
  const fuzzy = pool.filter((i) => !norm(i).includes(q) && subseq(q, norm(i)));
  return [...contains, ...fuzzy].slice(0, 14);
}
