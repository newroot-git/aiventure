// Generate a BIG diverse set of cute pixel-art adventurer PROFILE AVATARS in the
// locked AIventure cover style. Modeled on gen-train-cover.mjs / rollout-covers.mjs.
// Same OpenRouter call (google/gemini-2.5-flash-image), same retry, same magick post.
// Output: public/img/avatars/avatar-1.png … avatar-<N>.png, square 512x512.
// Broad spectrum of looks with strong East/SE-Asian + Singapore representation.
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

// 40 distinct characters — broad spectrum of ethnicities, ages, hair, accessories.
// Strong East-Asian / Southeast-Asian / Singapore representation for this audience.
const CHARS = [
  // East Asian
  { bg: "dusty teal",          desc: "East-Asian young woman, fair skin, sleek straight black hair with a blunt fringe, a soft smile, mustard-yellow tee." },
  { bg: "soft slate blue",     desc: "East-Asian young man, light skin, short tidy black hair, thin round glasses, navy collared shirt." },
  { bg: "muted rose pink",     desc: "Korean young woman, fair skin, shoulder-length dark-brown hair tucked behind one ear, dusty-pink jumper." },
  { bg: "warm sand beige",     desc: "Japanese young man, light skin, slightly tousled black hair, a calm grin, olive utility shirt." },
  { bg: "soft mustard ochre",  desc: "East-Asian woman, warm skin, low ponytail with a few loose strands, small gold studs, teal henley." },
  // Southeast Asian / Singapore
  { bg: "warm clay orange",    desc: "Singaporean Chinese young man, tan skin, short black hair, a cheerful broad smile, light grey tee." },
  { bg: "muted forest green",  desc: "Malay young woman wearing a soft cream hijab framing a friendly face, warm brown skin, sage-green top." },
  { bg: "dusty brick red",     desc: "Tamil Singaporean young woman, deep brown skin, long dark wavy hair, a small gold nose stud, plum blouse." },
  { bg: "soft dusty blue",     desc: "Filipino young man, warm brown skin, short wavy black hair, a friendly grin, denim-blue collar." },
  { bg: "warm peach",          desc: "Thai young woman, tan skin, dark hair in a high messy bun, bright smile, coral tee." },
  { bg: "muted olive",         desc: "Vietnamese young man, light-tan skin, neat black hair, square tortoiseshell glasses, khaki shirt." },
  { bg: "soft terracotta clay",desc: "Indonesian young woman, warm brown skin, dark shoulder-length hair, soft smile, rust-orange top." },
  { bg: "dusty teal",          desc: "Southeast-Asian young man, brown skin, short cropped hair, small silver earring, charcoal henley." },
  // South Asian
  { bg: "warm honey gold",     desc: "North-Indian young woman, brown skin, long dark braid over one shoulder, small bindi, marigold-yellow kurta collar." },
  { bg: "muted sage green",    desc: "Indian young man, deep brown skin, short black hair, neat beard, a warm smile, forest-green shirt." },
  { bg: "dusty lavender",      desc: "Sri Lankan young woman, deep brown skin, dark curls pulled half-up, gold hoop earrings, lilac top." },
  { bg: "soft stone grey",     desc: "Sikh young man wearing a neat maroon turban, brown skin, short dark beard, a kind smile, grey collared shirt." },
  // Black / African
  { bg: "soft mustard ochre",  desc: "dark-brown-skinned young woman, short natural afro, big bright smile, gold hoop earrings, teal tee." },
  { bg: "warm clay orange",    desc: "Black young man, rich dark-brown skin, short twists, a thin gold chain, mustard henley." },
  { bg: "muted forest green",  desc: "African young woman, deep skin, hair in neat box braids gathered up, a small nose stud, cream knit collar." },
  { bg: "dusty brick red",     desc: "Black young man, dark skin, shaved sides with short curls on top, round glasses, charcoal tee." },
  { bg: "soft slate blue",     desc: "young woman, deep brown skin, hair in two small space buns, freckles across the nose, coral top." },
  // Middle Eastern / North African
  { bg: "warm sand beige",     desc: "Middle-Eastern young man, olive-tan skin, dark wavy hair, neat short beard, soft smile, sand-brown shirt." },
  { bg: "dusty lavender",      desc: "Middle-Eastern young woman in a soft taupe headscarf, warm skin, friendly eyes, dusty-rose top." },
  // Latino / Hispanic
  { bg: "warm peach",          desc: "Latina young woman, tan skin, long wavy chestnut hair, warm smile, terracotta tee." },
  { bg: "muted olive",         desc: "Latino young man, brown skin, short curly dark hair, light stubble, olive flannel collar." },
  // White / European (varied)
  { bg: "muted sage green",    desc: "fair-skinned young woman, ginger hair under a rust-orange knit beanie, light freckles, cream collared shirt." },
  { bg: "soft dusty blue",     desc: "pale-skinned young man, messy sandy-blond hair, a green camp cap, brown corduroy collar." },
  { bg: "dusty brick red",     desc: "fair-skinned young woman, long copper-red braids, soft freckles, forest-green hooded top." },
  { bg: "soft stone grey",     desc: "light-skinned young man, swept dark-brown hair, faint stubble, square glasses, charcoal tee." },
  { bg: "warm honey gold",     desc: "fair-skinned young woman, wavy dark-blond hair, a wide cosy smile, soft lilac collared shirt." },
  { bg: "dusty teal",          desc: "pale-skinned young man, short brown hair, light freckles, a friendly grin, denim jacket collar." },
  // More variety — older, accessories, hats
  { bg: "muted forest green",  desc: "East-Asian woman in her 50s, warm skin, short greying bob, kind smile, fine glasses, moss-green blouse." },
  { bg: "warm clay orange",    desc: "older Black man with a short grey beard and close-cropped grey hair, warm dark skin, gentle smile, rust shirt." },
  { bg: "soft slate blue",     desc: "young person, light-olive skin, tousled brown undercut, small hoop earring, grey wool scarf." },
  { bg: "muted rose pink",     desc: "Southeast-Asian young woman, tan skin, long straight black hair, a flower-pink cap, soft smile, white tee." },
  { bg: "dusty teal",          desc: "Indian young woman, brown skin, short bob with a side part, round glasses, teal kurta collar." },
  { bg: "warm sand beige",     desc: "white young man, blond curly hair, sunburnt cheeks, a wide grin, sandy hiking shirt." },
  { bg: "soft mustard ochre",  desc: "mixed-race young woman, warm light-brown skin, curly amber-brown hair, freckles, mustard tee." },
  { bg: "muted olive",         desc: "East-Asian young man, light skin, neat black hair, a beanie, calm half-smile, olive overshirt collar." },
];

let ok = 0, fail = [];
const N = CHARS.length;
for (let i = 0; i < N; i++) {
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
      if (!img) console.error(`[${n}/${N}] attempt ${attempt}: no image ${JSON.stringify(json.error || "").slice(0, 160)}`);
    } catch (e) { console.error(`[${n}/${N}] attempt ${attempt} err: ${e.message}`); }
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
  console.log(`[${n}/${N}] saved avatar-${n}`);
}
console.log(`DONE ok=${ok} fail=${fail.length} ${fail.length ? "[" + fail.join(",") + "]" : ""}`);
