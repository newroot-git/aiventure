import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LOCKED_STYLE } from "./style.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";

// covers for the activity categories not already filled from the approved style-test set
const COVERS = {
  food: "A cosy little bistro on a quiet street with warm window light, calm evening",
  coffee: "A calm corner coffee shop with plants and soft morning light",
  games: "A cosy board-game cafe interior with warm lamps and shelves of games",
  beach: "A calm sandy cove and gentle sea under soft daylight",
  camp: "A quiet campsite, a tent among pine trees beside a still lake, calm morning",
  cycle: "A peaceful country lane through green fields, a bicycle resting by a fence",
  sport: "A quiet green park sports pitch under soft afternoon light",
  city: "A calm low-rise town street with a few people, soft daylight",
  trip: "A winding country road leading into gentle rolling hills, calm and quiet",
};

for (const [name, scene] of Object.entries(COVERS)) {
  const out = join(root, "public/img", `cover-${name}.png`);
  if (existsSync(out)) { console.log(`skip ${name}`); continue; }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: `${scene}. ${LOCKED_STYLE}` }],
        modalities: ["image", "text"],
      }),
    });
    const json = await res.json();
    const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) { console.error(`NO IMAGE ${name}`); continue; }
    writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved cover-${name}`);
  } catch (e) { console.error(`ERR ${name}:`, e.message); }
}
console.log("done");
