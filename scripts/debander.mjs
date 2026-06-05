// Remove near-white letterbox borders via fuzz-trim, then refit to 1024x683 full-bleed.
// Fuzz 10% only catches near-white (>=~225); coloured ghibli skies (cream/peach/blue) survive.
import { readdirSync as rd } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public/img");
const covers = rd(dir).filter((f) => f.startsWith("cover-") && f.endsWith(".png"));

let done = [];
for (const f of covers) {
  const src = join(dir, f);
  // add a 1px white frame so trim has a known border colour to chew from, then fuzz-trim,
  // then cover-fit back to exact 1024x683 (no stretch; minor side trim if needed).
  execFileSync("magick", [src,
    "-bordercolor", "white", "-border", "2",
    "-fuzz", "10%", "-trim", "+repage",
    "-resize", "1024x683^", "-gravity", "center", "-extent", "1024x683",
    src]);
  done.push(f);
}
console.log(`debanded ${done.length} covers`);
