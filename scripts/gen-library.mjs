import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LOCKED_STYLE } from "./style.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";

// rich activity library — calm peaceful scenes, locked style. Skips ones already made.
const LIB = {
  walk: "a gentle tree-lined path through a green park, soft daylight",
  run: "a quiet riverside running path at soft dawn",
  surf: "a calm beach with gentle waves and a surfboard on the sand, soft morning",
  swim: "a calm outdoor lido pool surrounded by greenery, soft light",
  kayak: "a still calm river with a kayak and soft reflections, morning",
  ski: "a quiet gentle snowy slope with pine trees, soft winter light",
  golf: "a calm green golf fairway over soft rolling hills, morning",
  tennis: "a quiet tennis court surrounded by trees, soft afternoon light",
  football: "a calm grassy football pitch in a park, soft light",
  yoga: "a calm yoga studio with soft light and plants, peaceful",
  stargazing: "a calm dark meadow under a soft gentle starry night sky",
  fishing: "a calm lake jetty with a fishing rod at soft dawn",
  bar: "a cosy bar on a quiet street with warm window light, evening",
  cocktails: "a cosy dim cocktail bar interior with warm amber light, calm",
  wine: "a cosy wine bar with barrels and warm light, calm evening",
  brunch: "a calm sunny brunch cafe terrace with plants, soft morning",
  roast: "a cosy country pub interior set for a roast dinner, warm light",
  bbq: "a calm backyard bbq in a garden on a soft summer evening",
  market: "a calm food market street with a few stalls, soft daylight",
  streetfood: "a calm street-food lane with a couple of stalls, warm evening",
  festival: "a calm festival field with bunting and tents in soft daylight",
  cinema: "a cosy independent cinema facade at dusk with a warm marquee",
  theatre: "a calm classic theatre exterior at dusk, soft light",
  comedy: "a cosy small comedy club interior with a warm spotlight, calm",
  gallery: "a calm bright art gallery interior with paintings, soft light",
  museum: "a calm grand museum hall interior, soft daylight",
  music: "a cosy small live-music venue interior, warm light, calm",
  arcade: "a cosy retro arcade interior with a soft glow, calm",
  bowling: "a calm bowling alley lane under soft warm light",
  karaoke: "a cosy karaoke room with warm light, calm",
  spa: "a calm serene spa with soft light and plants, peaceful",
  dance: "a calm dance studio with warm light and wooden floor",
};

for (const [name, scene] of Object.entries(LIB)) {
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
