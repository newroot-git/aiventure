// Colorful pixel-art NAV sprites (transparent bg) — Home / Calendar / Explore /
// Crew / Create / Inbox. Reference: RPG-loot pixel icons (gem/heart/key style).
// Run: node scripts/gen-nav-icons.mjs   (set FORCE=1 to regen existing)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const key = readFileSync(join(root, ".env.local"), "utf8").match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
const MODEL = "google/gemini-2.5-flash-image";
const FORCE = process.env.FORCE === "1";

const STYLE =
  "vibrant 16-bit pixel art game icon in the style of RPG loot/inventory sprites. " +
  "Single centered subject, bold saturated colors, chunky dark outline, clean HARD pixel edges (no blur, no anti-aliasing), a small soft drop shadow directly beneath. " +
  "NO text, NO letters, NO frame, NO border, NO ground/scene. " +
  "TRANSPARENT background (PNG alpha) — the subject is fully isolated.";

// [name, subject]
const JOBS = [
  ["home", "a cozy little pixel house with a warm-lit door (home)"],
  ["calendar", "a tear-off calendar page with a red top binding"],
  ["explore", "a brass magnetic compass with a red needle"],
  ["crew", "a friendly pair of little adventurer characters standing together"],
  ["create", "a bright glowing plus sign with a sparkle (create new)"],
  ["inbox", "an open mail/inbox tray with a letter in it"],
];

mkdirSync(join(root, "public/img/nav"), { recursive: true });
for (const [name, subject] of JOBS) {
  const out = join(root, "public/img/nav", `${name}.png`);
  if (existsSync(out) && !FORCE) { console.log(`skip ${name}`); continue; }
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
    if (!img) { console.error(`NO IMAGE ${name}:`, JSON.stringify(json).slice(0, 200)); continue; }
    writeFileSync(out, Buffer.from(img.split(",")[1], "base64"));
    console.log(`saved nav/${name}`);
  } catch (e) { console.error(`ERR ${name}:`, e.message); }
}
console.log("done");
