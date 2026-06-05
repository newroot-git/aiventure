// Reroll ONLY trip to match the warmer, richer rest of the v3 set.
// Anchor on coffee + beach (the matching warm ones). -> v3/trip.png
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const b64 = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const refA = b64("public/img/_styletest/v3/coffee.png");
const refB = b64("public/img/_styletest/v3/beach.png");

const prompt =
  "GENERATE A NEW IMAGE (do not describe). A few friends walking a winding country road into gentle rolling hills at golden hour. " +
  "Match the EXACT art style, palette, WARMTH, soft painterly finish, texture and light of the two reference images — it must look like part of the same collection, NOT flatter or more pastel than them: high-resolution 32-bit pixel art, fine dithering, soft gradients, naturalistic warm golden light, muted-warm earthy colours, rich gentle texture, serene cosy Studio Ghibli calm. " +
  "Render the friends EXACTLY like the references: a small group of 2 to 3 friends, far down the road and VERY SMALL — tiny distant silhouettes occupying less than 12% of the frame height, soft and simplified, no facial detail, anatomy simple and correct. The landscape is the hero, not the people. " +
  "Simple uncluttered composition, calm negative space, one focal point, NO text or signage of any kind. " +
  "The output MUST be a WIDE horizontal banner, much WIDER than it is tall (about 3:2, like a letterbox), fill the frame edge to edge with NO borders, landscape in the central band.";

let img;
for (let attempt = 1; attempt <= 4 && !img; attempt++) {
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
  if (!img) console.error(`attempt ${attempt}: no image, retrying`);
}
if (!img) { console.error("FAILED after retries"); process.exit(1); }
writeFileSync(join(root, "public/img/_styletest/v3/trip.png"), Buffer.from(img.split(",")[1], "base64"));
console.log("saved trip");
