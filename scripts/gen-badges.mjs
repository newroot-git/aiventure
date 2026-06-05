// Generate 8 pixel-art merit badges for AIventure. Modeled on rollout-covers.mjs.
// Each badge = circular gold-ringed medallion w/ a small ribbon notch + emblem, in the
// soft 32-bit muted-earthy pixel style of the covers. Square, centered, fills the frame.
// Style+finish anchored on two existing covers so the set reads as one collection.
// Retry on no-image. Saves to public/img/badges/<id>.png, fuzz-trims baked cream border,
// refits to a clean 256x256 square on the cream bg.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const outDir = join(root, "public/img/badges");
mkdirSync(outDir, { recursive: true });
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/cover-camp.png");   // warm sunset palette + soft pixel finish
const refB = b64("public/img/cover-coffee.png");  // cosy muted-earthy interior tones

const STYLE =
  "Match the EXACT art style, palette, warmth, soft painterly finish, fine dithering and gentle light of the reference images: high-resolution 32-bit pixel art (NOT chunky), muted-warm earthy colours, cosy and serene. Keep the whole set looking like ONE consistent collection.";
const MEDAL =
  "Render a single circular pixel-art MERIT BADGE, like a pixelated scout merit badge: a round medallion with a thick gold ring (gold #E0A458) and a darker ink outline, a small ribbon notch or two short ribbon tails at the bottom, and the emblem centered inside on a warm cream face (#EAE1CF). Add a tiny gold star/sparkle accent as a recurring brand motif on the ring. Soft hard-shadow pixel depth.";
const FRAME =
  "SQUARE canvas (1:1). The round badge is centered and fills MOST of the frame with a small even margin. Plain flat cream background #EAE1CF behind the badge — NO scene, NO landscape. Absolutely NO text, NO words, NO numbers, NO letters anywhere on the badge.";

const BADGES = {
  first:       "Emblem: a pair of footprints / little boot prints starting off along a trail.",
  crew:        "Emblem: three small simple friendly figures standing together as a little group.",
  curious:     "Emblem: one bold gold five-pointed star with a soft sparkle.",
  five:        "Emblem: a small warm campfire flame with a couple of logs.",
  connector:   "Emblem: a simple heart formed by two linked hands.",
  renaissance: "Emblem: a cluster of several gold stars and sparkles of varying sizes.",
  ten:         "Emblem: a classic two-handled victory trophy cup in gold.",
  legend:      "Emblem: a simple regal crown in gold with small jewel dots.",
};

const ids = Object.keys(BADGES);
let ok = 0, fail = [];
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const prompt = `GENERATE A NEW IMAGE (do not describe it). ${BADGES[id]} ${MEDAL} ${STYLE} ${FRAME}`;
  let img;
  for (let attempt = 1; attempt <= 4 && !img; attempt++) {
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
      img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!img) console.error(`[${i + 1}/${ids.length}] ${id} attempt ${attempt}: no image`);
    } catch (e) { console.error(`[${i + 1}/${ids.length}] ${id} attempt ${attempt} err: ${e.message}`); }
  }
  if (!img) { fail.push(id); continue; }
  const out = join(outDir, `${id}.png`);
  writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
  // strip baked near-white/cream letterbox the model adds, then fit to a clean 256x256 square
  // on cream so every badge has identical framing.
  try {
    execFileSync("magick", [out,
      "-bordercolor", "white", "-border", "2", "-fuzz", "12%", "-trim", "+repage",
      "-resize", "240x240", "-background", "#EAE1CF", "-gravity", "center",
      "-extent", "256x256", out]);
  } catch (e) { console.error(`magick ${id}: ${e.message}`); }
  ok++;
  console.log(`[${i + 1}/${ids.length}] saved ${id}`);
}
console.log(`DONE ok=${ok} fail=${fail.length} ${fail.length ? "[" + fail.join(",") + "]" : ""}`);
