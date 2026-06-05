// Full rollout: regenerate all 46 covers in the locked v3 recipe.
// Style+char anchored on v3 coffee + v3 trip. Retry on no-image. Crop to 3:2.
// Replaces public/img/cover-<name>.png. Originals already backed up in _covers_backup/.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const imgDir = join(root, "public/img");
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/_styletest/v3/coffee.png"); // preferred char + finish
const refB = b64("public/img/_styletest/v3/trip.png");   // wide warm landscape

const STYLE =
  "Match the EXACT art style, palette, warmth, soft painterly finish, texture and light of the reference images so every cover looks like ONE consistent collection: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky), naturalistic light, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm.";
const CHAR =
  "Render any people EXACTLY like the references: a small group of 2 to 4 friends, mid-distance and small in frame, soft and simplified, gentle generic faces (no facial detail), relaxed natural poses, anatomy simple and CORRECT — no extra, duplicated or malformed limbs, no distorted hands. NEVER a crowd. The setting is the hero, not the people.";
const SIMPLE =
  "Keep the composition SIMPLE and uncluttered even if the real place would be busy: minimal props, plenty of calm negative space, one clear focal point. Absolutely NO text, NO words, NO signage, NO logos, NO readable writing anywhere.";
const FRAME =
  "The output MUST be a WIDE horizontal banner, much WIDER than it is tall (about 3:2, like a letterbox), filled edge to edge with NO borders, with the key subject in the central horizontal band so it survives a wide crop.";

const SCENES = {
  arcade: "A few friends at a glowing retro arcade, soft warm light.",
  bar: "A couple of friends outside a cosy warm-lit bar on a quiet cobbled street at soft dusk.",
  bbq: "A few friends around a garden barbecue at golden hour.",
  beach: "A few friends together on a calm quiet beach at soft golden hour, gentle sea.",
  bowling: "A few friends at a cosy bowling alley with warm lane lights.",
  brunch: "A small group of friends at a sunny brunch table by a window.",
  camp: "A few friends at a quiet campsite, a tent among pine trees beside a still lake, calm morning.",
  cinema: "A couple of friends in cosy cinema seats with soft screen glow.",
  city: "A few friends walking a calm low-rise town street in soft daylight.",
  climb: "A couple of friends at an indoor climbing wall with colourful holds.",
  cocktails: "A few friends sharing cocktails at a calm warm-lit bar.",
  coffee: "A small group of friends sharing a table by the window of a calm sunlit cafe.",
  comedy: "A few friends at a cosy comedy club with a small stage and warm light.",
  cycle: "A few friends cycling a peaceful country lane through green fields.",
  dance: "A few friends dancing in a warm-lit room with a soft glow.",
  festival: "A few friends at a calm outdoor festival field with string lights at soft dusk.",
  fishing: "A couple of friends fishing from a quiet lakeside jetty at soft morning.",
  food: "A small group of friends at a cosy little bistro with warm window light.",
  football: "A few friends on a quiet green park football pitch in soft afternoon light.",
  gallery: "A couple of friends walking a calm bright art gallery.",
  games: "Three friends around a small table on a board-game night with warm lamplight.",
  gig: "A few friends at a small open-air music gig at dusk with string lights.",
  golf: "A couple of friends on a calm green golf course at soft morning.",
  hike: "A few friends hiking a grassy hilltop trail toward distant mountains at golden hour.",
  karaoke: "A few friends in a cosy karaoke room with a warm soft neon glow.",
  kayak: "A couple of friends kayaking on a calm still lake at soft morning.",
  market: "A few friends wandering a calm outdoor market in soft daylight.",
  museum: "A couple of friends in a calm bright museum hall.",
  music: "A few friends at a small intimate live-music room with warm light.",
  park: "A few friends on a picnic blanket in a calm green park beside a pond.",
  pub: "A couple of friends outside a cosy traditional pub with warm windows at dusk.",
  roast: "A small group of friends at a warm Sunday roast table by a window.",
  run: "A couple of friends jogging a quiet park path at soft morning.",
  ski: "A few friends on a calm snowy ski slope in soft mountain light.",
  spa: "A couple of friends relaxing at a calm serene spa in soft light.",
  sport: "A few friends on a quiet green sports pitch in soft afternoon light.",
  stargazing: "A few friends sitting on a hill watching a calm starry night sky.",
  streetfood: "A few friends at a calm street-food spot with warm lantern light.",
  surf: "A couple of friends with surfboards on a calm beach at golden hour.",
  swim: "A few friends at a calm lake at soft daylight.",
  tennis: "A couple of friends on a quiet tennis court in soft afternoon light.",
  theatre: "A couple of friends in a warm cosy theatre with a soft stage glow.",
  trip: "A few friends walking a winding country road into gentle rolling hills at golden hour.",
  walk: "A few friends on a calm woodland walk in soft dappled light.",
  wine: "A few friends sharing wine on a calm vineyard terrace at golden hour.",
  yoga: "A few friends doing yoga in a calm bright studio at soft morning light.",
};

const names = Object.keys(SCENES);
let ok = 0, fail = [];
for (let i = 0; i < names.length; i++) {
  const name = names[i];
  const scene = SCENES[name];
  const prompt = `GENERATE A NEW IMAGE (do not describe it). ${scene} ${STYLE} ${CHAR} ${SIMPLE} ${FRAME}`;
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
      if (!img) console.error(`[${i + 1}/46] ${name} attempt ${attempt}: no image`);
    } catch (e) { console.error(`[${i + 1}/46] ${name} attempt ${attempt} err: ${e.message}`); }
  }
  if (!img) { fail.push(name); continue; }
  const out = join(imgDir, `cover-${name}.png`);
  writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
  // strip any baked near-white letterbox the model adds, then fit full-bleed to 3:2 (1024x683)
  try {
    execFileSync("magick", [out,
      "-bordercolor", "white", "-border", "2", "-fuzz", "10%", "-trim", "+repage",
      "-resize", "1024x683^", "-gravity", "center", "-extent", "1024x683", out]);
  } catch {}
  ok++;
  console.log(`[${i + 1}/46] saved cover-${name}`);
}
console.log(`DONE ok=${ok} fail=${fail.length} ${fail.length ? "[" + fail.join(",") + "]" : ""}`);
writeFileSync(join(root, "scripts/.rollout-done"), `ok=${ok} fail=${fail.join(",")}\n`);
