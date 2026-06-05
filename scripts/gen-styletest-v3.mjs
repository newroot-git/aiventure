// v3: lock on the PREFERRED look. Anchor = coffee.png (character + finish Josh likes)
// + trip.png (wide landscape framing). Fix anatomy errors, harmonise bar.
// Output -> public/img/_styletest/v3/
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const outDir = join(root, "public/img/_styletest/v3");
mkdirSync(outDir, { recursive: true });

const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const charRef = b64("public/img/_styletest/v2/coffee.png"); // preferred character + finish
const wideRef = b64("public/img/_styletest/trip-C_ghibli.png"); // wide landscape framing

const STYLE =
  "Match the EXACT art style, palette, soft painterly finish and light of the reference images: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky), naturalistic light, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm. The whole set must look like one consistent collection.";

// Character lock — match the cafe reference exactly.
const CHAR =
  "Render any people EXACTLY like the cafe reference: a small group of 2 to 4 friends, mid-distance and fairly small in frame, soft and simplified, gentle generic faces, relaxed natural poses. Keep anatomy simple and CORRECT — no extra, duplicated or malformed limbs, no distorted hands (keep hands simple or out of view). NEVER a crowd.";

const SIMPLE =
  "Keep the composition SIMPLE and uncluttered even if the real place would be busy: minimal props, plenty of calm negative space, one clear focal point. Absolutely NO text, NO words, NO signage, NO logos, NO readable writing anywhere.";

const FRAME =
  "Wide cinematic landscape banner, fill the entire frame edge to edge with NO borders or letterbox, key subject in the central horizontal band so it survives a wide 3:2 crop with generous sky above and ground below.";

const SCENES = {
  trip: "A few friends walking a winding country road into gentle rolling hills at golden hour.",
  coffee: "A small group of friends sharing a table by the window of a calm sunlit cafe.",
  bar: "A couple of friends outside a cosy warm-lit bar on a quiet cobbled street at soft dusk, kept gentle and painterly and NOT dark or high-contrast, matching the soft finish of the references.",
  games: "Three friends around a small table on a board-game night, warm lamplight, cosy room.",
  beach: "A few friends together on a calm quiet beach at soft golden hour, gentle sea.",
};

for (const [name, scene] of Object.entries(SCENES)) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `${scene} ${STYLE} ${CHAR} ${SIMPLE} ${FRAME}` },
            { type: "image_url", image_url: { url: charRef } },
            { type: "image_url", image_url: { url: wideRef } },
          ],
        }],
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
