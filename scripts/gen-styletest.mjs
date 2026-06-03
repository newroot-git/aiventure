// Style cohesion test: ONE locked lush-pixel style across many varied subjects.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)[1].trim();
const MODEL = "google/gemini-2.5-flash-image";

// THE LOCKED STYLE — lush detailed painterly pixel-art landscapes (Ghibli / lo-fi indie game)
const STYLE =
  "Lush highly-detailed pixel-art landscape, high-resolution 32-bit pixel art with fine pixel dithering and smooth colour gradients (NOT chunky low-res blocky pixels), vibrant saturated colours, dramatic sky with big soft cumulus clouds, golden-hour atmospheric lighting, layered depth with hazy distant mountains, rich greens and warm light, delicate wildflowers in the foreground, serene cosy nostalgic mood, Studio Ghibli inspired, beautiful indie-game key-art. No text, no words, no UI, full bleed.";

const SUBJECTS = {
  hike: "A winding dirt trail climbing a green grassy hill toward a summit, a tiny lone hiker, golden-hour light",
  pub: "A cosy stone country pub with warm glowing windows beside a quiet lane at dusk",
  climb: "Dramatic grey rocky crags and cliffs with pine trees and a waterfall, morning light",
  field: "A path through a golden wheat field under a huge blue sky full of cumulus clouds",
  cabin: "A wooden cabin beside a misty mountain lake at pink sunrise, smoke rising from the chimney, reflections",
  beach: "A sandy cove and calm turquoise sea at sunset, cliffs framing the bay, warm orange sky",
  town: "A town of red rooftops and a church spire nestled in rolling green hills at golden hour",
  forest: "A sun-dappled pine forest trail with ferns and shafts of warm light through the trees",
  cafe: "A cosy little cafe on a cobbled street corner with warm lanterns and plants, soft evening light",
  gig: "An open-air music stage in a meadow at dusk with string lights and a small crowd silhouette, starry sky",
  valley: "A blue river winding through a lush green valley with a small village and distant mountains",
  picnic: "A big old oak tree on a flower meadow with a checked picnic blanket, bright blue sky and clouds",
};

mkdirSync(join(root, "public/img/styletest"), { recursive: true });
for (const [name, subject] of Object.entries(SUBJECTS)) {
  const out = join(root, "public/img/styletest", `${name}.png`);
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
    console.log(`saved ${name}`);
  } catch (e) { console.error(`ERR ${name}:`, e.message); }
}
console.log("done");
