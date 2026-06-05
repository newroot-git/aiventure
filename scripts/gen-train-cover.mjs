// Generate ONE new cover: cover-train.png, in the locked v3 collection style.
// Modeled on rollout-covers.mjs. Style anchored on the live trip + coffee covers.
// Retry on no-image. Fuzz-trim baked cream letterbox + refit full-bleed to 3:2 (1024x683).
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const imgDir = join(root, "public/img");
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/cover-coffee.png"); // char + soft finish
const refB = b64("public/img/cover-trip.png");   // wide warm landscape

const STYLE =
  "Match the EXACT art style, palette, warmth, soft painterly finish, texture and light of the reference images so this cover looks like ONE consistent collection: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky), naturalistic light, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm.";
const CHAR =
  "Render any people EXACTLY like the references: 2 to 4 friends, mid-distance and small in frame, soft and simplified, gentle generic faces (no facial detail), relaxed natural poses, anatomy simple and CORRECT — no extra, duplicated or malformed limbs, no distorted hands. NEVER a crowd. The setting is the hero, not the people.";
const SIMPLE =
  "Keep the composition SIMPLE and uncluttered: minimal props, plenty of calm negative space, one clear focal point. Absolutely NO text, NO words, NO signage, NO logos, NO readable writing anywhere.";
const FRAME =
  "The output MUST be a WIDE horizontal banner, much WIDER than it is tall (about 3:2, like a letterbox), filled edge to edge with NO borders, with the key subject in the central horizontal band so it survives a wide crop.";

const SCENE =
  "A couple of friends on a scenic vintage train journey, seen calmly inside a warm-lit wooden carriage with a large window framing soft rolling countryside and gentle hills sliding past, warm golden afternoon light pouring in.";

const name = "train";
const prompt = `GENERATE A NEW IMAGE (do not describe it). ${SCENE} ${STYLE} ${CHAR} ${SIMPLE} ${FRAME}`;

let img;
for (let attempt = 1; attempt <= 5 && !img; attempt++) {
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
    if (!img) console.error(`${name} attempt ${attempt}: no image ${JSON.stringify(json.error || "").slice(0, 200)}`);
  } catch (e) { console.error(`${name} attempt ${attempt} err: ${e.message}`); }
}
if (!img) { console.error("FAILED: no image after retries"); process.exit(1); }

const out = join(imgDir, `cover-${name}.png`);
writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
// strip any baked near-white letterbox the model adds, then fit full-bleed to 3:2 (1024x683)
execFileSync("magick", [out,
  "-bordercolor", "white", "-border", "2", "-fuzz", "10%", "-trim", "+repage",
  "-resize", "1024x683^", "-gravity", "center", "-extent", "1024x683", out]);
console.log(`saved cover-${name}`);
