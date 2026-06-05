import "server-only";

// AIventure planning agent — OpenRouter (Claude). Server-only.
// Generates real, specific suggestions grounded in the model's world knowledge,
// with Google-Maps search links (no paid grounding API required).

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TILES = [
  // outdoors / active
  "hike", "walk", "climb", "cycle", "run", "surf", "swim", "kayak", "ski",
  "golf", "tennis", "football", "yoga", "camp", "beach", "stargazing", "fishing",
  // food & drink
  "pub", "bar", "cocktails", "wine", "coffee", "brunch", "food", "roast", "bbq", "market", "streetfood",
  // culture & nightlife
  "gig", "festival", "cinema", "theatre", "comedy", "gallery", "museum", "music",
  // games / play
  "games", "arcade", "bowling", "karaoke",
  // chill / misc
  "park", "city", "trip", "spa", "dance",
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
  aiBuild?: boolean; // true = AI fills slots; false = empty named skeleton
}

export interface DropOptionOut {
  title: string;
  subtitle?: string;
  why?: string;
  place_name?: string;
  map_query?: string;
  tile: string;
  time?: string;
}

// A slot is one ordered step of a plan ("Food", "Main thing", "After"),
// holding 2-4 voteable options. A whole plan is an ordered list of slots.
export interface DropSlot {
  key: string;            // stable-ish slot id, e.g. "food" | "main" | "after"
  label: string;          // display, e.g. "Food", "Main thing"
  day?: number;           // 1-based; 1 for single-day plans
  fixed?: boolean;        // a locked step with no vote (single option)
  options: DropOptionOut[];
}

function mapsUrl(q?: string) {
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : undefined;
}

// clamp + escape user free-text before interpolating into a prompt (injection + JSON safety)
function sanitize(s: string | undefined, maxLen: number): string {
  if (!s) return "";
  return s
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, " ") // strip control chars
    .replace(/`/g, "'")               // collapse backticks
    .replace(/"/g, "'")               // escape stray double-quotes
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

// strip markdown fences / prose and parse the first JSON value
function parseJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/[[{]/);
  if (start > 0) t = t.slice(start);
  try {
    return JSON.parse(t);
  } catch {
    throw new Error("model returned malformed JSON");
  }
}

let loggedModel = false;

async function callOpenRouter(system: string, user: string, maxTokens = 1500): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
  if (!loggedModel) {
    console.warn(`[ai] OpenRouter model resolved: ${model}`);
    loggedModel = true;
  }

  const ctrl = new AbortController();
  // fire before the route's maxDuration so we surface a clean error, not a hard cut
  const timeout = setTimeout(() => ctrl.abort(), 25000);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "AIventure",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.95,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("model timed out");
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  // read raw text first — gateway errors (502/504/rate-limit) often return HTML, not JSON
  const body = await res.text();
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  let json: { choices?: { message?: { content?: string } }[] };
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`OpenRouter returned non-JSON: ${body.slice(0, 200)}`);
  }
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("model returned empty content");
  return content;
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

// only accept a real "HH:MM" clock time; drop prose like "lunch" / "2-3 hours"
function cleanTime(t?: string): string | undefined {
  return t && /^\d{1,2}:\d{2}$/.test(t.trim()) ? t.trim() : undefined;
}
function cleanOption(o: DropOptionOut): DropOptionOut {
  return {
    ...o,
    tile: TILES.includes(o.tile as (typeof TILES)[number]) ? o.tile : "city",
    map_query: o.map_query || o.place_name,
    time: cleanTime(o.time),
  };
}

// drop options the LLM returned without a usable title (blank card + "undefined" Maps link)
function hasTitle(o: DropOptionOut | undefined): o is DropOptionOut {
  return !!o && typeof o.title === "string" && o.title.trim().length > 0;
}

// Generate a plan as an ordered list of slots, each holding voteable options.
// one-thing/surprise → 1 slot · a day → 3-4 slots · a trip → 2-4 slots per day.
export async function generateDrop(input: DropInput): Promise<{ title: string; area: string; slots: DropSlot[] }> {
  const intent = sanitize(input.intent, 500);
  const location = input.location || "London, UK";
  const interests = (input.interests || []).slice(0, 12).map((i) => sanitize(i, 60)).filter(Boolean).join(", ") || "a bit of everything";
  const ctx = `Default location: ${location}
Crew: ${sanitize(input.who, 120) || "a few friends"}
When: ${sanitize(input.when, 120) || "soon"}
Budget: ${sanitize(input.budget, 120) || "flexible"}
Crew interests: ${interests}
Intent: "${intent}"

LOCATION RULE: if the intent names a place/city (e.g. "in Hong Kong", "Lisbon trip"),
EVERY pick must be in THAT place — it overrides the default location above. Only fall
back to the default location when the intent names no place.`;

  let shape: string;
  if (input.scope === "trip") {
    const days = Math.max(1, input.nights || 2);
    shape = `Plan a ${days}-day trip. Return slots across all ${days} days.
Each day has 2-4 ordered slots (e.g. Morning, Lunch, Afternoon, Evening). Set "day" 1-based (1..${days}).
Each slot offers 2-3 distinct, voteable options for that step. Order slots sensibly through each day.`;
  } else if (input.scope === "adventure") {
    shape = `Plan a single full day. Return 3-4 ordered slots that flow through the day
(e.g. "Food", "Main thing", "After" / "Drinks"). All slots are day 1.
Each slot offers 2-3 distinct, voteable options for that step. Order slots through the day.`;
  } else {
    shape = `The crew want ONE thing. Return exactly 1 slot whose "label" names the activity type
(e.g. "Dinner", "The hike", "Drinks"). That slot offers 3-4 distinct, voteable options.`;
  }

  const user = `${ctx}

${shape}
Every option MUST have a "subtitle" — a short detail line (type · rough price · area), e.g. "Wine bar · ~£8/glass · Soho".
Also give the whole plan a short, evocative "title" (3-6 words) that captures the vibe — NOT just a place name. e.g. "Big Bristol Saturday", "Slow Sunday Roast Run".
Also set "area" to the actual town/city/region ALL these picks are in (e.g. "Hong Kong", "Bristol, UK") — infer it from the location and intent. Every option must be in this same area.
Return STRICT JSON only: {"title","area","slots":[{"key","label","day","options":[{"title","subtitle","why","place_name","map_query","tile","time"}]}]}.
"key" = a short lowercase slug for the slot (e.g. "food", "main", "after"). "time" = optional "HH:MM" for that step.
Make picks genuinely varied and tailored to the intent — not a generic highlights list.`;

  const maxTokens = input.scope === "trip" ? 3000 : 2000;
  let lastTitle = "";
  let lastArea = "";

  // one model call + parse; retry once on a parse/empty failure before giving up
  const run = async (): Promise<DropSlot[]> => {
    const raw = await callOpenRouter(SYSTEM, user, maxTokens);
    const parsed = parseJson(raw) as { title?: string; area?: string; slots?: DropSlot[] };
    lastTitle = (parsed.title || "").slice(0, 80);
    lastArea = (parsed.area || "").slice(0, 120);
    return (parsed.slots || [])
      .filter((s) => Array.isArray(s.options) && s.options.length > 0)
      .map((s, i) => ({
        key: (s.key || `slot${i}`).toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || `slot${i}`,
        label: s.label || "Pick one",
        day: s.day && s.day > 0 ? s.day : 1,
        fixed: !!s.fixed,
        options: s.options.filter(hasTitle).map(cleanOption),
      }))
      .filter((s) => s.options.length > 0);
  };

  let slots: DropSlot[];
  try {
    slots = await run();
  } catch (e) {
    if (e instanceof Error && /malformed JSON|empty content/.test(e.message)) {
      slots = await run(); // single retry, same inputs
    } else {
      throw e;
    }
  }

  // never persist a hollow plan — surface a real error so the caller returns a 502
  if (slots.length === 0 || slots.every((s) => s.options.length === 0)) {
    throw new Error("model returned no valid options");
  }
  return { title: lastTitle, area: lastArea, slots };
}

// Regenerate the voteable options for ONE slot (used by per-slot refine).
export async function generateSlotOptions(
  slotLabel: string,
  intent: string,
  location = "London, UK",
  feedback?: string,
): Promise<DropOptionOut[]> {
  const safeLabel = sanitize(slotLabel, 80);
  const safeIntent = sanitize(intent, 500);
  const safeFeedback = sanitize(feedback, 300);
  const steer = safeFeedback ? `\nImportant preference for this step: ${safeFeedback}` : "";
  const user = `Location: ${location}. Plan: "${safeIntent}".
ALL picks MUST be in ${location} (the same place as the rest of this plan — never drift to another city).
Suggest EXACTLY 3 distinct, voteable options for the "${safeLabel}" step of this plan.${steer}
Every option MUST have a "subtitle" (type · rough price · area).
Return STRICT JSON only: {"options":[{"title","subtitle","why","place_name","map_query","tile","time"}]}.
"tile" = best-fit from: ${TILES.join(", ")}. Keep "why" to one short, warm sentence.`;
  try {
    const raw = await callOpenRouter(SYSTEM, user, 1200);
    const parsed = parseJson(raw) as { options?: DropOptionOut[] };
    return (parsed.options || []).filter(hasTitle).map(cleanOption);
  } catch (e) {
    // re-throw hard failures (missing key / timeout / non-ok HTTP); only swallow genuinely-empty results
    if (e instanceof Error && /OPENROUTER_API_KEY missing|model timed out|OpenRouter \d{3}|non-JSON/.test(e.message)) throw e;
    return [];
  }
}

// Resolve a free-typed place/business into ONE real, specific venue (the "ask AI
// to find this exact place" path — when OSM search can't surface a named spot).
export async function resolvePlace(query: string, location = "London, UK"): Promise<DropOptionOut | null> {
  const q = sanitize(query, 200);
  if (!q) return null;
  const user = `In ${location}, the user typed: "${q}".
Resolve it to ONE real, specific, named place/venue/business that best matches (fix spelling; pick the most likely real place in or near ${location}).
Return STRICT JSON only: {"title","subtitle","why","place_name","map_query","tile"}.
"tile" = best-fit from: ${TILES.join(", ")}. "subtitle" = short detail (type · area). "why" = one short, warm line.`;
  try {
    const raw = await callOpenRouter(SYSTEM, user, 500);
    const o = parseJson(raw) as DropOptionOut;
    if (!hasTitle(o)) return null;
    return cleanOption(o);
  } catch {
    return null;
  }
}

export { mapsUrl };
