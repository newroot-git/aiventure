// Regenerate covers in ONE consistent style by anchoring on the best one (cover-hike)
// as a style reference image passed to Nano Banana.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
const MODEL = "google/gemini-2.5-flash-image";

const anchor = readFileSync(join(root, "public/img/cover-hike.png"));
const anchorUrl = `data:image/png;base64,${anchor.toString("base64")}`;

const STYLE =
  "Match the EXACT art style, colour palette, pixel resolution, lighting and framing of the reference image. 16-bit pixel art, muted earthy retro palette, soft dusk light, cosy adventurous mood, clean crisp pixels, no text, no words, no UI, no people close-up.";

const JOBS = [
  ["cover-pub", "A cosy pixel-art pub exterior at dusk with warm glowing windows and lanterns."],
  ["cover-climb", "A pixel-art indoor climbing wall with colourful holds and a bouldering cave."],
  ["cover-park", "A pixel-art park with big trees, a picnic blanket and a calm pond."],
  ["cover-gig", "A pixel-art open-air music gig at dusk with a small stage, string lights and a starry sky."],
];

for (const [name, scene] of JOBS) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${scene} ${STYLE}` },
              { type: "image_url", image_url: { url: anchorUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    const json = await res.json();
    const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) {
      console.error(`NO IMAGE ${name}:`, JSON.stringify(json).slice(0, 240));
      continue;
    }
    writeFileSync(join(root, "public/img", `${name}.png`), Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved ${name}`);
  } catch (e) {
    console.error(`ERR ${name}:`, e.message);
  }
}
console.log("done");
