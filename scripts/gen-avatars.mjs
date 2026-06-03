// Cute pixel-art character avatars via Nano Banana.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
const MODEL = "google/gemini-2.5-flash-image";

const STYLE =
  "cute 16-bit pixel art character avatar, head and shoulders portrait, friendly expression, muted retro earthy palette (terracotta, gold, forest green, dusk blue, cream), simple flat solid colour background that fills the whole frame edge to edge, centered, clean pixels, no text, no border, no white margin, full bleed.";

const VARIANTS = [
  "a person with a green beanie and freckles",
  "a person with curly brown hair and round glasses",
  "a person with a ponytail and a denim jacket",
  "a person with a buzz cut and a hoodie",
  "a person with long red hair and earrings",
  "a person with a bucket hat and a friendly smile",
  "a bearded person with a flannel shirt",
  "a person with an afro and headphones",
  "a person with blonde bangs and a scarf",
  "a person with glasses and a moustache",
];

mkdirSync(join(root, "public/img/avatars"), { recursive: true });

for (let i = 0; i < VARIANTS.length; i++) {
  const name = `a${i + 1}`;
  const out = join(root, "public/img/avatars", `${name}.png`);
  if (existsSync(out)) { console.log(`skip ${name}`); continue; }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: `${VARIANTS[i]}. ${STYLE}` }],
        modalities: ["image", "text"],
      }),
    });
    const json = await res.json();
    const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) { console.error(`NO IMAGE ${name}`); continue; }
    writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved ${name}`);
  } catch (e) { console.error(`ERR ${name}:`, e.message); }
}
console.log("done");
