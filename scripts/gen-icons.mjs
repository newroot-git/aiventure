// Pixel UI icons (full-bleed) for notifications + a full-bleed log pile.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
const MODEL = "google/gemini-2.5-flash-image";

const STYLE =
  "bold 16-bit pixel art icon, single clear centered subject, muted retro earthy palette (terracotta, gold, forest green, dusk blue, warm cream), flat, minimal, soft dusk light, no text, no letters. CRITICAL: artwork and background FILL the entire square canvas edge to edge — no white border, no frame, no margin, full bleed.";

// [folder, name, subject]
const JOBS = [
  ["tiles", "log", "a neat stacked pile of chopped firewood logs"],
  ["icons", "invite", "a closed envelope letter with a small wax seal"],
  ["icons", "nudge", "a pointing hand index finger giving a friendly poke"],
  ["icons", "bell", "a small notification bell"],
  ["icons", "spark", "a four-point sparkle star"],
];

for (const [folder, name, subject] of JOBS) {
  mkdirSync(join(root, "public/img", folder), { recursive: true });
  const out = join(root, "public/img", folder, `${name}.png`);
  if (folder === "tiles" && name === "log" && existsSync(out)) rmSync(out);
  if (existsSync(out)) { console.log(`skip ${name}`); continue; }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: `${subject}. ${STYLE}` }],
        modalities: ["image", "text"],
      }),
    });
    const json = await res.json();
    const img = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) { console.error(`NO IMAGE ${name}`); continue; }
    writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved ${folder}/${name}`);
  } catch (e) { console.error(`ERR ${name}:`, e.message); }
}
console.log("done");
