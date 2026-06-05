// Generate AIventure LOGO options in the locked cover art style.
// Concept: three friends CLOSE to camera (foreground silhouettes, from behind),
// watching a detailed pixel-art sunset. Square 1:1 app-icon composition.
// Style + character anchored on existing covers so it matches the collection.
// Output -> docs/brand/logo-gen/*.png
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/cover-hike.png");        // 3 friends from behind, golden sunset
const refB = b64("public/img/cover-stargazing.png");  // 3 friends seated, big sky

const outDir = join(root, "docs/brand/logo-gen");
mkdirSync(outDir, { recursive: true });

const STYLE =
  "Match the EXACT art style, palette, warmth, soft painterly finish, dithering and light of the reference images so it reads as the SAME collection: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky low-res), naturalistic light, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm.";
const CHAR =
  "EXACTLY THREE friends sitting close together, seen from BEHIND looking away at the view. They are CLOSE to the camera and LARGE in the frame — filling the lower foreground as warm backlit silhouettes against the sky, shoulders and heads clearly readable. Soft and simplified, generic shapes, no facial detail. Anatomy simple and CORRECT — no extra, duplicated or malformed limbs. Three people only, never a crowd, never four.";
const FRAME =
  "SQUARE 1:1 composition that works as an app icon: the three friends grouped in the lower-centre foreground, the sun low on the horizon behind them, calm sky filling the upper half. Balanced and uncluttered, one clear focal point. Artwork FILLS the whole square edge to edge — full bleed, NO border, NO frame, NO letterbox.";
const CLEAN =
  "Absolutely NO text, NO words, NO letters, NO signage, NO logos, NO UI, NO readable writing anywhere.";

const JOBS = [
  ["cliff-sunset",
   "Three friends sitting close together on a rocky cliff-top ledge in the foreground, seen from behind as warm silhouettes, gazing out over a vast golden valley of forest and far hills under a soft glowing sunset."],
  ["hill-sunset",
   "Three friends sitting close together on a grassy hilltop in the foreground, seen from behind as warm silhouettes, watching a soft golden-hour sun set over gentle rolling countryside and a calm warm sky."],
  ["beach-sunset",
   "Three friends sitting close together on the sand in the foreground, seen from behind as warm silhouettes, watching a soft sun set over a calm sea with gentle muted-warm reflections."],
  ["cliff-dusk",
   "Three friends sitting close together on a rocky cliff-top ledge in the foreground, seen from behind as silhouettes, watching the last of the sun fade over a valley into a calm dusk sky with the very first faint stars appearing."],
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
  const prompt = `GENERATE A NEW IMAGE (do not describe it). ${scene} ${STYLE} ${CHAR} ${FRAME} ${CLEAN}`;
  const img = await gen(prompt);
  if (!img) { console.error(`FAILED ${name}`); continue; }
  const out = join(outDir, `${name}.png`);
  writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
  // trim any baked near-white border, then square fit to 1024
  try {
    execFileSync("magick", [out,
      "-bordercolor", "white", "-border", "2", "-fuzz", "8%", "-trim", "+repage",
      "-filter", "Lanczos", "-resize", "1024x1024^", "-gravity", "center", "-extent", "1024x1024",
      "-unsharp", "0x0.6+0.6+0", out]);
  } catch (e) { console.error(`  magick skipped ${name}:`, e.message); }
  console.log(`saved logo-gen/${name}.png`);
}
console.log("done");
