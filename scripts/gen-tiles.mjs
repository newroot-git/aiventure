// Generate small pixel-art activity tiles for calendar day backgrounds.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
const MODEL = "google/gemini-2.5-flash-image";

const STYLE =
  "Simple bold 16-bit pixel art tile, single clear centered subject, muted retro earthy palette (terracotta, gold, forest green, dusk blue, warm cream), flat, minimal detail, readable when small, soft dusk light, no text, no words, no UI, no letters. CRITICAL: the artwork and its background must FILL the entire square canvas edge to edge — absolutely no white border, no frame, no padding, no margin, full bleed, the background colour extends to all four edges.";

const TILES = {
  hike: "a mountain peak with a small trail",
  pub: "a frothy beer mug",
  climb: "a climbing wall with colourful holds",
  gig: "a small music stage with stage lights",
  park: "a single big leafy tree on grass",
  beach: "a sun setting over a calm sea wave",
  camp: "a camping tent under a star",
  cycle: "a bicycle",
  food: "a plate of food",
  coffee: "a coffee cup with steam",
  games: "a pair of dice and a game controller",
  sport: "a football on grass",
  city: "a row of city buildings at dusk",
  trip: "a winding road into hills with a car",
  log: "a neat stacked pile of chopped firewood logs",
};

mkdirSync(join(root, "public/img/tiles"), { recursive: true });

for (const [name, subject] of Object.entries(TILES)) {
  const out = join(root, "public/img/tiles", `${name}.png`);
  if (existsSync(out)) { console.log(`skip ${name}`); continue; }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: `${subject}. ${STYLE}` }],
        modalities: ["image", "text"],
      }),
    });
    const json = await res.json();
    const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) { console.error(`NO IMAGE ${name}:`, JSON.stringify(json).slice(0, 200)); continue; }
    writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved ${name}`);
  } catch (e) {
    console.error(`ERR ${name}:`, e.message);
  }
}
console.log("done");
