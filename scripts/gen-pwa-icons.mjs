// Generate PLACEHOLDER PWA icons (no real logo asset exists yet — swap these for
// the real brand mark when it's drawn). Brand: red #ce3b2a on cream, gold star.
// Run: node scripts/gen-pwa-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const RED = "#ce3b2a";
const CREAM = "#f5efe1";
const GOLD = "#eba92c";
const NIGHT = "#241f33";

// `inset` = fraction of padding around the mark (maskable needs a safe zone)
function svg({ inset = 0 } = {}) {
  const S = 512;
  const pad = Math.round(S * inset);
  const box = S - pad * 2;
  const cx = S / 2;
  // a chunky cream "A" + a small gold sparkle, on a dusk-to-red field
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${NIGHT}"/>
      <stop offset="0.55" stop-color="${RED}"/>
      <stop offset="1" stop-color="${RED}"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <g transform="translate(${pad},${pad})">
    <g transform="translate(${box / 2},${box / 2})" fill="${CREAM}">
      <!-- blocky A: two legs + crossbar, centered -->
      <polygon points="${box * -0.22},${box * 0.28} ${box * -0.06},${box * -0.28} ${box * 0.06},${box * -0.28} ${box * 0.22},${box * 0.28} ${box * 0.10},${box * 0.28} ${box * 0.0},${box * -0.06} ${box * -0.10},${box * 0.28}"/>
      <rect x="${box * -0.115}" y="${box * 0.04}" width="${box * 0.23}" height="${box * 0.085}"/>
    </g>
    <!-- gold sparkle top-right of the mark -->
    <g transform="translate(${box * 0.70},${box * 0.26})" fill="${GOLD}">
      <polygon points="0,${box * -0.10} ${box * 0.028},${box * -0.028} ${box * 0.10},0 ${box * 0.028},${box * 0.028} 0,${box * 0.10} ${box * -0.028},${box * 0.028} ${box * -0.10},0 ${box * -0.028},${box * -0.028}"/>
    </g>
  </g>
</svg>`;
}

async function out(name, size, opts) {
  await sharp(Buffer.from(svg(opts))).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log("wrote", name, size);
}

await mkdir("public/icons", { recursive: true });
await out("icon-192.png", 192, { inset: 0 });
await out("icon-512.png", 512, { inset: 0 });
await out("maskable-512.png", 512, { inset: 0.16 }); // safe zone for maskable
await out("apple-touch-icon.png", 180, { inset: 0.08 }); // iOS rounds it itself
console.log("done — PLACEHOLDER icons (swap for real brand mark later)");
