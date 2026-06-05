// One-off: regenerate the landing hero in the locked v3 cover style.
// Scene: friends on a log atop a cliff, Yosemite vista, golden hour. Wide 16:9.
// Style+char anchored on existing new covers (cover-hike + cover-camp).
// Output -> public/img/hero-cliff.png
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/cover-hike.png"); // friends in a warm golden landscape
const refB = b64("public/img/cover-camp.png"); // pine forest + lake + mountains

const STYLE =
  "Match the EXACT art style, palette, warmth, soft painterly finish, texture and light of the reference images so it looks like the SAME collection: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky), naturalistic light, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm.";
const CHAR =
  "Render the people EXACTLY like the references: a small group of 3 to 4 friends, mid-distance and small in frame, seen from BEHIND looking away at the view, soft and simplified, gentle generic shapes (no facial detail), relaxed natural seated poses, anatomy simple and CORRECT — no extra, duplicated or malformed limbs. NEVER a crowd. The landscape is the hero.";
const SIMPLE =
  "Keep the composition SIMPLE and uncluttered: one clear focal point, plenty of calm sky and negative space. Absolutely NO text, NO words, NO signage, NO logos, NO readable writing anywhere.";
const FRAME =
  "The output MUST be a WIDE cinematic horizontal banner, much WIDER than it is tall (about 16:9), filled edge to edge with NO borders or letterbox. Compose with the friends in the RIGHT THIRD of the frame and leave the LEFT TWO-THIRDS as calm open valley, forest and sky negative space.";

const scene =
  "A small group of 3 to 4 friends sitting close together on a low sturdy fallen log that rests flat on a solid granite ledge at a cliff-top viewpoint — the log is safely on the ground, NOT overhanging or near the edge — positioned in the right third of the frame, seen from behind, gazing out over a vast Yosemite-style valley filling the centre and left: deep green pine forest, sweeping granite cliffs, a distant waterfall and far blue mountains, soft warm golden-hour sunlight and gentle haze, calm open sky.";

const prompt = `GENERATE A NEW IMAGE (do not describe it). ${scene} ${STYLE} ${CHAR} ${SIMPLE} ${FRAME}`;
const out = join(root, "public/img/hero-cliff-3.png");

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
    if (!img) console.error(`attempt ${attempt}: no image — ${JSON.stringify(json).slice(0, 200)}`);
  } catch (e) { console.error(`attempt ${attempt} err: ${e.message}`); }
}
if (!img) { console.error("FAILED: no image after retries"); process.exit(1); }

writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
// strip any baked near-white letterbox, then fit full-bleed to 16:9 (1600x900)
try {
  execFileSync("magick", [out,
    "-bordercolor", "white", "-border", "2", "-fuzz", "10%", "-trim", "+repage",
    "-filter", "Lanczos", "-resize", "2400x1350^", "-gravity", "center", "-extent", "2400x1350",
    "-unsharp", "0x0.7+0.7+0", out]);
} catch (e) { console.error("magick trim skipped:", e.message); }
console.log("saved public/img/hero-cliff.png");
