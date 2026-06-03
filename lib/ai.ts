import "server-only";

// AIventure planning agent — OpenRouter (Claude). Server-only.
// Generates real, specific suggestions grounded in the model's world knowledge,
// with Google-Maps search links (no paid grounding API required).

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TILES = [
  "hike", "pub", "climb", "gig", "park", "beach", "camp",
  "cycle", "food", "coffee", "games", "sport", "city", "trip",
] as const;

export interface DropInput {
  scope: "surprise" | "single" | "adventure" | "trip";
  intent: string;
  when?: string;
  budget?: string;
  who?: string;
  nights?: number;
  interests?: string[];
  location?: string;
}

export interface DropOptionOut {
  title: string;
  subtitle?: string;
  why?: string;
  place_name?: string;
  map_query?: string;
  tile: string;
}
export interface DropActivityOut extends DropOptionOut {
  time?: string;
  day?: number;
}

function mapsUrl(q?: string) {
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : undefined;
}

// strip markdown fences / prose and parse the first JSON value
function parseJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/[[{]/);
  if (start > 0) t = t.slice(start);
  return JSON.parse(t);
}

async function callOpenRouter(system: string, user: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "AIventure",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        temperature: 0.95,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: ctrl.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
    return json.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

const SYSTEM = `You are AIventure's planning agent. You turn a loose intent into real, specific, doable suggestions for a friend group.
Rules:
- Suggest REAL, specific, named places/venues/activities that genuinely exist in the given location. No invented venues.
- HONOUR THE USER'S EXACT INTENT first — match what they actually asked for before anything generic.
- VARY your picks. Do NOT default to the same handful of famous tourist spots every time (avoid always suggesting Dishoom, Flat Iron, Hampstead Heath, The Castle, etc.). Favour a fresh mix that leans toward characterful, independent, locally-loved places over the obvious chains.
- Tailor to the crew's interests, budget and timing, but stay surprising and specific.
- For each item, set "tile" to the single best-fit category from this exact list: ${TILES.join(", ")}.
- Keep "why" to one short, warm sentence.
- "map_query" = a string you'd type into Google Maps to find it (venue name + area).
- Respond with STRICT JSON only. No markdown, no prose, no code fences.`;

export async function generateDrop(input: DropInput): Promise<{
  kind: "options" | "itinerary";
  options?: DropOptionOut[];
  activities?: DropActivityOut[];
}> {
  const intent = (input.intent || "").slice(0, 500);
  const location = input.location || "London, UK";
  const interests = (input.interests || []).slice(0, 12).join(", ") || "a bit of everything";
  const ctx = `Location: ${location}
Crew: ${input.who || "a few friends"}
When: ${input.when || "soon"}
Budget: ${input.budget || "flexible"}
Crew interests: ${interests}
Intent: "${intent}"`;

  if (input.scope === "adventure" || input.scope === "trip") {
    const days = input.scope === "trip" ? Math.max(1, input.nights || 2) : 1;
    const user = `${ctx}

Build an itinerary of ${input.scope === "trip" ? `${days} days, 3-4 activities per day` : "3-4 back-to-back activities for one day"}.
Return JSON: {"activities":[{"title","time","place_name","map_query","why","tile","day"}]}.
"day" is 1-based (1..${days}). Order activities sensibly through each day.`;
    const raw = await callOpenRouter(SYSTEM, user);
    const parsed = parseJson(raw) as { activities?: DropActivityOut[] };
    const activities = (parsed.activities || []).map((a) => ({
      ...a,
      tile: TILES.includes(a.tile as (typeof TILES)[number]) ? a.tile : "city",
      day: a.day || 1,
      map_query: a.map_query || a.place_name,
    }));
    return { kind: "itinerary", activities };
  }

  const user = `${ctx}

Suggest EXACTLY 3-4 distinct options for this (no more, no fewer). Every option MUST have a "subtitle".
Return JSON: {"options":[{"title","subtitle","why","place_name","map_query","tile"}]}.
"subtitle" = a short detail line (type · rough price · area), e.g. "Wine bar · ~£8/glass · Soho".
Make the picks genuinely varied and tailored to the intent above — not a generic London highlights list.`;
  const raw = await callOpenRouter(SYSTEM, user);
  const parsed = parseJson(raw) as { options?: DropOptionOut[] };
  const options = (parsed.options || []).map((o) => ({
    ...o,
    tile: TILES.includes(o.tile as (typeof TILES)[number]) ? o.tile : "city",
    map_query: o.map_query || o.place_name,
  }));
  return { kind: "options", options };
}

export { mapsUrl };
