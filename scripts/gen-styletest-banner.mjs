// Style bake-off: SAME scene, 3 candidate styles, WIDE banner aspect.
// Output -> public/img/_styletest/ so we don't clobber live covers.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const outDir = join(root, "public/img/_styletest");
mkdirSync(outDir, { recursive: true });

// Banner-safe framing rules applied to EVERY style
const FRAME =
  "Wide cinematic landscape BANNER composition, 3:2 aspect ratio (much wider than tall), key subject kept in the central horizontal band so it survives a wide crop. NO text, NO words, NO signage, NO close-up people or faces (distant tiny silhouettes only).";

// Two test scenes: a trip landscape (easy) + a venue (the hard case)
const SCENES = {
  trip: "A winding country road leading into gentle rolling hills at golden hour, a single small hiker far in the distance.",
  bar: "A cosy warm-lit bar on a quiet cobbled street at dusk, glowing windows, lanterns, seen from across the street.",
};

const STYLES = {
  A_bright:
    "16-bit pixel art, crisp clean chunky pixels, warm and colourful but tasteful, big soft stylised clouds, bright golden-hour light, adventurous game-title-screen energy.",
  B_dusk:
    "16-bit pixel art, muted earthy restrained palette, soft dusk light, calm quiet grounded mood, gentle dithering, understated and atmospheric.",
  C_ghibli:
    "High-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky), naturalistic soft daylight, gentle muted-warm colours, serene cosy Studio Ghibli calm.",
};

const jobs = [];
for (const [sName, scene] of Object.entries(SCENES))
  for (const [stName, style] of Object.entries(STYLES))
    jobs.push([`${sName}-${stName}`, `${scene} ${style} ${FRAME}`]);

for (const [name, prompt] of jobs) {
  try {
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
    const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) { console.error(`NO IMAGE ${name}:`, JSON.stringify(json).slice(0, 200)); continue; }
    writeFileSync(join(outDir, `${name}.png`), Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved ${name}`);
  } catch (e) { console.error(`ERR ${name}:`, e.message); }
}
console.log("done");
