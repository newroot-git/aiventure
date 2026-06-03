// Visual-language exploration: one scene rendered in many art styles for review.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";

const SCENE = "Two friends on a sunset hike, standing on a grassy hill looking over a distant city skyline at golden hour";
const PALETTE = "warm muted earthy palette — terracotta, gold, forest green, dusk blue, cream";

const STYLES = {
  "pixel-16bit": `16-bit pixel art, retro game style, ${PALETTE}, clean crisp pixels`,
  "flat-vector": `modern flat vector illustration, bold simple shapes, minimal detail, ${PALETTE}`,
  "painterly": `soft painterly digital illustration, storybook feel, gentle brushwork, ${PALETTE}`,
  "risograph": `risograph screenprint look, 2-3 spot colours, grainy halftone texture, ${PALETTE}`,
  "gouache": `textured gouache painting, cosy hand-painted, visible paper grain, ${PALETTE}`,
  "lowpoly": `low-poly 3D render, faceted geometry, soft studio light, ${PALETTE}`,
  "lineart": `minimal line-art badge, single warm ink colour on cream paper, vintage outdoor patch style`,
  "claymation": `cute 3D clay / claymation render, soft rounded forms, tactile, ${PALETTE}`,
};

mkdirSync(join(root, "public/img/styles"), { recursive: true });
for (const [name, style] of Object.entries(STYLES)) {
  const out = join(root, "public/img/styles", `${name}.png`);
  if (existsSync(out)) { console.log(`skip ${name}`); continue; }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: `${SCENE}. Style: ${style}. No text, no words, full bleed.` }],
        modalities: ["image", "text"],
      }),
    });
    const json = await res.json();
    const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) { console.error(`NO IMAGE ${name}`); continue; }
    writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved ${name}`);
  } catch (e) { console.error(`ERR ${name}:`, e.message); }
}
console.log("done");
