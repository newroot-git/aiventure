// AIventure ICON system: the sun-on-horizon as one bold mark, with three tiny
// friend-silhouette heads along the bottom (human heart, but the SUN dominates so
// it reads at 20px). Locked pixel-art style. Output -> docs/brand/logo-gen/mark-*.png
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/cover-hike.png");
const refB = b64("docs/brand/logo-gen/cliff-sunset.png");

const outDir = join(root, "docs/brand/logo-gen");
mkdirSync(outDir, { recursive: true });

const STYLE =
  "Match the EXACT art style, palette and warmth of the references: high-resolution 32-bit pixel art with fine dithering and soft gradients, naturalistic warm light, gentle muted-warm earthy colours, serene cosy calm. A pixel sun with subtle horizontal banding is welcome (retro game sun).";
const FRAME =
  "SQUARE 1:1 app icon. EXTREMELY SIMPLE and bold — ONE clear focal subject that reads at tiny size: a large warm sun low on the horizon, dominating the frame. Calm gradient sky fills the rest. Uncluttered, lots of negative space. Artwork FILLS the whole square edge to edge — full bleed, NO border, NO frame, NO letterbox.";
const CLEAN =
  "Absolutely NO text, NO words, NO letters, NO UI, NO readable writing anywhere.";
const FIGS =
  "Along the very BOTTOM edge, three small simple friend silhouettes (just heads and shoulders, seen from behind, close together, backlit) — tiny, secondary, so the SUN clearly dominates. Exactly three, simplified, correct simple anatomy, never a crowd.";

const JOBS = [
  ["mark-sun-friends",
   `A big glowing golden sun resting on a calm horizon, warm sunset gradient sky. ${FIGS}`],
  ["mark-sun-dusk",
   `A big soft sun low on the horizon in a calm dusk sky of warm peach fading to gentle dusky purple with one or two faint early stars. ${FIGS}`],
  ["mark-sun-pure",
   "A big glowing golden sun resting on a simple calm horizon line over distant soft hills, warm sunset gradient sky. No people. Ultra-minimal, iconic, bold."],
  ["mark-sun-peak",
   "A big warm sun cresting right behind a single simple rounded hill on the horizon, calm warm sunset gradient sky. Minimal and iconic. No people."],
];

async function gen(prompt) {
  for (let a = 1; a <= 5; a++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: refA } },
            { type: "image_url", image_url: { url: refB } },
          ] }],
          modalities: ["image", "text"],
        }),
      });
      const json = await res.json();
      const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (img) return img;
      console.error(`  attempt ${a}: no image — ${JSON.stringify(json).slice(0, 160)}`);
    } catch (e) { console.error(`  attempt ${a} err: ${e.message}`); }
  }
  return null;
}

for (const [name, scene] of JOBS) {
  const prompt = `GENERATE A NEW IMAGE (do not describe it). ${scene} ${STYLE} ${FRAME} ${CLEAN}`;
  const img = await gen(prompt);
  if (!img) { console.error(`FAILED ${name}`); continue; }
  const out = join(outDir, `${name}.png`);
  writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
  try {
    execFileSync("magick", [out,
      "-bordercolor", "white", "-border", "2", "-fuzz", "8%", "-trim", "+repage",
      "-filter", "Lanczos", "-resize", "1024x1024^", "-gravity", "center", "-extent", "1024x1024",
      "-unsharp", "0x0.6+0.6+0", out]);
  } catch (e) { console.error(`  magick skipped ${name}:`, e.message); }
  console.log(`saved logo-gen/${name}.png`);
}
console.log("done");
