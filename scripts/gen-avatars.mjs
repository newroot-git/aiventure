// Generate 16 cute pixel-art adventurer PROFILE AVATARS in the locked AIventure
// cover style. Modeled on gen-train-cover.mjs / rollout-covers.mjs.
// Same OpenRouter call (google/gemini-2.5-flash-image), same retry, same magick post.
// Output: public/img/avatars/avatar-1.png … avatar-16.png, square 512x512.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const outDir = join(root, "public/img/avatars");
mkdirSync(outDir, { recursive: true });
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/cover-coffee.png"); // soft characters + finish
const refB = b64("public/img/cover-camp.png");   // warm palette + light

const STYLE =
  "Match the EXACT art style, palette, warmth, soft painterly finish, texture and light of the reference images: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky), naturalistic soft light, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm. The whole set must look like ONE consistent collection of profile avatars.";
const FRAME =
  "Composition is a CLOSE head-and-shoulders BUST PORTRAIT of ONE single friendly cute little adventurer character, facing the viewer, perfectly centered, the head and shoulders filling MOST of the square frame (the face is the hero). IDENTICAL framing and crop for every avatar: same close bust crop, same centering, same eye level, shoulders just visible at the bottom edge. Square 1:1 image, filled edge to edge with NO borders, NO letterbox bars.";
const BG =
  "Background is a SIMPLE FLAT single muted-warm solid colour ONLY — no scene, no objects, no scenery, no gradient detail, just one clean calm colour behind the character.";
const CLEAN =
  "Soft simplified gentle face (cute, warm, friendly, a hint of a smile), anatomy simple and CORRECT, no malformed features. Absolutely NO text, NO words, NO letters, NO logos, NO watermark, NO emoji anywhere.";

// 16 distinct characters — varied skin tones, hair, simple outfits & accents.
const CHARS = [
  { bg: "soft terracotta clay", desc: "warm brown skin, short curly black hair, a friendly grin, simple olive-green hiker shirt." },
  { bg: "muted sage green",     desc: "fair skin, ginger hair under a rust-orange knit beanie, light freckles, cream collared shirt." },
  { bg: "dusty teal",           desc: "deep brown skin, short cropped dark hair, round amber glasses, mustard-yellow tee." },
  { bg: "warm sand beige",      desc: "light tan skin, long wavy auburn hair, soft smile, faded denim-blue jacket." },
  { bg: "muted rose pink",      desc: "olive skin, dark hair in a low bun, small gold hoop earrings, dusty-pink shirt." },
  { bg: "soft slate blue",      desc: "pale skin, messy sandy-blond hair, a green camp cap, brown corduroy collar." },
  { bg: "soft mustard ochre",   desc: "rich dark-brown skin, short twists, a warm broad smile, teal henley shirt." },
  { bg: "dusty lavender",       desc: "light skin, straight black hair with a blunt fringe, thin silver glasses, plum jumper." },
  { bg: "warm clay orange",     desc: "tan skin, curly chestnut hair, a checked red flannel collar, cheerful smile." },
  { bg: "muted forest green",   desc: "medium brown skin, short afro, a thin gold nose stud, cream chunky-knit collar." },
  { bg: "soft dusty blue",      desc: "fair skin, shoulder-length light-brown hair, a navy beanie, grey wool scarf." },
  { bg: "warm peach",           desc: "deep brown skin, hair in two small space buns, big bright smile, coral tee." },
  { bg: "muted olive",          desc: "light-olive skin, swept dark hair, faint stubble, square tortoiseshell glasses, khaki shirt." },
  { bg: "dusty brick red",      desc: "pale skin, long copper-red braids, soft freckles, forest-green hooded top." },
  { bg: "soft stone grey",      desc: "brown skin, shaved sides with short curls on top, a flat-brim grey cap, charcoal tee." },
  { bg: "warm honey gold",      desc: "tan skin, wavy dark-blond hair, a wide cosy smile, soft lilac collared shirt." },
];

let ok = 0, fail = [];
for (let i = 0; i < CHARS.length; i++) {
  const n = i + 1;
  const c = CHARS[i];
  const prompt = `GENERATE A NEW IMAGE (do not describe it). A single cute friendly little pixel-art adventurer: ${c.desc} The flat background colour is ${c.bg}. ${STYLE} ${FRAME} ${BG} ${CLEAN}`;
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
      if (!img) console.error(`[${n}/16] attempt ${attempt}: no image ${JSON.stringify(json.error || "").slice(0, 160)}`);
    } catch (e) { console.error(`[${n}/16] attempt ${attempt} err: ${e.message}`); }
  }
  if (!img) { fail.push(n); continue; }
  const out = join(outDir, `avatar-${n}.png`);
  writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
  // strip any baked near-white letterbox the model adds, then fit full-bleed to a clean 512x512 square.
  try {
    execFileSync("magick", [out,
      "-bordercolor", "white", "-border", "2", "-fuzz", "10%", "-trim", "+repage",
      "-resize", "512x512^", "-gravity", "center", "-extent", "512x512", out]);
  } catch {}
  ok++;
  console.log(`[${n}/16] saved avatar-${n}`);
}
console.log(`DONE ok=${ok} fail=${fail.length} ${fail.length ? "[" + fail.join(",") + "]" : ""}`);
