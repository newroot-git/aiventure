// Generate pixel-art assets via OpenRouter (Nano Banana / Gemini 2.5 Flash Image).
// Usage: node scripts/gen-images.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// load OPENROUTER_API_KEY from .env.local
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
if (!key) throw new Error("no OPENROUTER_API_KEY in .env.local");

const MODEL = "google/gemini-2.5-flash-image";
const STYLE =
  "16-bit pixel art, retro game art, muted but colorful earthy palette (terracotta, dusk purple, gold, forest green, warm parchment), soft dusk lighting, clean crisp pixels, cozy adventurous mood, no text, no words, no UI";

const JOBS = [
  ["hero-forest", `A wide dusk pixel-art forest with tall pine trees, a glowing moon, stars, distant mountains, a small figure on a trail. ${STYLE}`],
  ["cover-hike", `Pixel-art sunset hike scene: a grassy hill with a winding trail, golden-hour sky, rolling hills. ${STYLE}`],
  ["cover-pub", `Pixel-art cozy pub exterior at dusk, warm glowing windows, lanterns, a few wooden tables outside. ${STYLE}`],
  ["cover-climb", `Pixel-art indoor climbing wall with colorful holds, a boulder cave, warm light. ${STYLE}`],
  ["cover-park", `Pixel-art park with big trees, a picnic blanket, a pond, autumn leaves, soft light. ${STYLE}`],
  ["cover-gig", `Pixel-art open-air music gig at dusk, small stage, string lights, crowd silhouettes, starry sky. ${STYLE}`],
];

mkdirSync(join(root, "public/img"), { recursive: true });

async function gen(name, prompt) {
  const out = join(root, "public/img", `${name}.png`);
  if (existsSync(out)) {
    console.log(`skip ${name} (exists)`);
    return;
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`FAIL ${name}:`, JSON.stringify(json).slice(0, 300));
    return;
  }
  const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!img) {
    console.error(`NO IMAGE ${name}:`, JSON.stringify(json).slice(0, 300));
    return;
  }
  const b64 = img.split(",")[1];
  writeFileSync(out, Buffer.from(b64, "base64"));
  console.log(`saved ${name} (${Math.round(Buffer.from(b64, "base64").length / 1024)}kb)`);
}

for (const [name, prompt] of JOBS) {
  try {
    await gen(name, prompt);
  } catch (e) {
    console.error(`ERR ${name}:`, e.message);
  }
}
console.log("done");
