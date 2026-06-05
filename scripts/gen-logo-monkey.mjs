// Logo riff: three friends as the "three wise monkeys" — see-no / hear-no / speak-no.
// Anti-social-media spin: switch off the noise, go outside. Locked pixel-art style.
// Output -> docs/brand/logo-gen/monkey-*.png
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
const refB = b64("public/img/cover-stargazing.png");

const outDir = join(root, "docs/brand/logo-gen");
mkdirSync(outDir, { recursive: true });

const STYLE =
  "Match the EXACT art style, palette, warmth, soft painterly finish, dithering and light of the reference images so it reads as the SAME collection: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky low-res), naturalistic warm light, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm.";
const POSE =
  "EXACTLY THREE friends side by side in a row, simplified and generic with no facial detail, anatomy simple and CORRECT (two arms, two hands each, no extra or malformed limbs). They are posed as the three wise monkeys, a clear and readable gag: the LEFT friend covers their EYES with both hands, the MIDDLE friend covers their EARS with both hands, the RIGHT friend covers their MOUTH with both hands. Three people only, never a crowd, never four.";
const FRAME =
  "SQUARE 1:1 composition that works as an app icon: the three friends centred and large, filling the frame as warm characters against a calm sunset background, balanced and uncluttered. Artwork FILLS the whole square edge to edge — full bleed, NO border, NO frame, NO letterbox.";
const CLEAN =
  "Absolutely NO text, NO words, NO letters, NO signage, NO logos, NO UI, NO readable writing anywhere.";

const JOBS = [
  ["monkey-front",
   "Three friends standing close together in a row facing the camera, warm golden-hour sunlight on them, a soft blurred sunset landscape of hills behind."],
  ["monkey-seated",
   "Three friends sitting close together in a row on a grassy hilltop facing the camera, a soft golden sunset sky behind them."],
  ["monkey-flat",
   "Three friends as simple half-body characters in a row facing the camera, on a clean calm warm gradient sky background with a small low sun, minimal and uncluttered like an icon."],
  ["monkey-silhouette",
   "Three friends in a row as warm backlit near-silhouettes against a bright soft sunset, the see-no / hear-no / speak-no hand gestures still clearly readable in the silhouette shapes."],
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
  const prompt = `GENERATE A NEW IMAGE (do not describe it). ${scene} ${STYLE} ${POSE} ${FRAME} ${CLEAN}`;
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
