// v2 bake-off: locked Ghibli style + SIMPLICITY GUARANTEE + style-anchor reference.
// 5 diverse covers incl. the hard busy ones. Output -> public/img/_styletest/v2/
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";
const outDir = join(root, "public/img/_styletest/v2");
mkdirSync(outDir, { recursive: true });

// Style lock: anchor on the approved wide ghibli sample so all covers match it.
const anchor = readFileSync(join(root, "public/img/_styletest/trip-C_ghibli.png"));
const anchorUrl = `data:image/png;base64,${anchor.toString("base64")}`;

const STYLE =
  "Match the EXACT art style, palette, light and finish of the reference image: high-resolution 32-bit pixel art with fine dithering and soft gradients (NOT chunky low-res), naturalistic soft daylight, gentle muted-warm earthy colours, serene cosy Studio Ghibli calm.";

// The simplicity guarantee — keep it clean even when the real place is busy.
const SIMPLE =
  "Keep the composition SIMPLE and uncluttered even if the real place would be busy: show at most a small group of 2 to 4 friends together, NEVER a crowd. Minimal props, plenty of calm negative space, one clear focal point. Friends are small to mid-distance, gentle and generic, often turned away — never close-up portrait faces. Absolutely NO text, NO words, NO signage, NO logos, NO readable writing anywhere.";

const FRAME =
  "Wide cinematic landscape banner, fill the entire frame edge to edge with NO borders or letterbox, key subject kept in the central horizontal band so it survives a wide crop.";

const SCENES = {
  trip: "A few friends walking a winding country road into gentle rolling hills at golden hour.",
  coffee: "A small group of friends sharing a table by the window of a calm sunlit cafe.",
  bar: "A couple of friends outside a cosy warm-lit bar on a quiet cobbled street at dusk.",
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
            { type: "text", text: `${scene} ${STYLE} ${SIMPLE} ${FRAME}` },
            { type: "image_url", image_url: { url: anchorUrl } },
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
