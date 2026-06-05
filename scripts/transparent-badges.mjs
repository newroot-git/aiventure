// Make the 8 AIventure merit-badge PNGs transparent-background so each medallion
// floats on the page (no cream box). Post-processes the EXISTING art (does NOT
// regenerate) — the badges are already a clean, consistent collection.
//
// Method: EDGE flood-fill of the cream backdrop (#EAE1CF) to alpha from all four
// corners. Flood-fill (not a global -transparent) means the cream FACE inside the
// gold ring is preserved — it is enclosed by the ring and never reached from the
// edge. The cream between/around the ribbon tails IS reached (connected to the
// edge) so it goes transparent too, which is what we want.
//
// Output: 256x256, alpha. imageRendering stays pixelated (component-side, untouched).
// Re-runnable: keeps a one-time .orig backup so re-running starts from the source art.
import { readdirSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public/img/badges");
const SIZE = 256;
const FUZZ = "18%";          // tolerance for cream-shade variation in the backdrop
const BG = "#EAE1CF";        // cream backdrop / chroma colour to key out

const ids = readdirSync(dir)
  .filter((f) => f.endsWith(".png") && !f.endsWith(".orig.png"))
  .map((f) => f.replace(/\.png$/, ""));

let ok = 0;
const fail = [];

for (const id of ids) {
  const out = join(dir, `${id}.png`);
  const orig = join(dir, `${id}.orig.png`);
  // First run: snapshot the source art so the operation is idempotent.
  if (!existsSync(orig)) copyFileSync(out, orig);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Normalise to a flat SIZE canvas on the cream bg first (defensive — keeps
      // every badge identically framed even if a source PNG differs), then alpha
      // out the cream by flooding from each corner.
      execFileSync("magick", [orig,
        "-background", BG, "-gravity", "center", "-extent", `${SIZE}x${SIZE}`,
        "-alpha", "set", "-fuzz", FUZZ, "-fill", "none",
        "-draw", "color 0,0 floodfill",
        "-draw", `color ${SIZE - 1},0 floodfill`,
        "-draw", `color 0,${SIZE - 1} floodfill`,
        "-draw", `color ${SIZE - 1},${SIZE - 1} floodfill`,
        out]);

      // Verify: corner must be transparent, centre face must stay opaque.
      const cornerA = execFileSync("magick", [out, "-format", "%[fx:p{0,0}.a]", "info:"]).toString().trim();
      const centreA = execFileSync("magick", [out, "-format", `%[fx:p{${SIZE / 2},${Math.round(SIZE * 0.43)}}.a]`, "info:"]).toString().trim();
      if (cornerA !== "0") throw new Error(`corner not transparent (a=${cornerA})`);
      if (centreA !== "1") throw new Error(`centre face eaten (a=${centreA})`);

      ok++;
      console.log(`ok  ${id}  (corner.a=${cornerA} centre.a=${centreA})`);
      break;
    } catch (e) {
      console.error(`fail ${id} attempt ${attempt}: ${e.message}`);
      if (attempt === 3) fail.push(id);
    }
  }
}

console.log(`DONE ok=${ok} fail=${fail.length} ${fail.length ? "[" + fail.join(",") + "]" : ""}`);
if (fail.length) process.exit(1);
