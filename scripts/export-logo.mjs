// Export the AIventure sun mark (construction A: solid sun, friends knocked out)
// as crisp pixel PNGs, no browser. Dependency-free PNG encoder.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "brand", "logo");
mkdirSync(outDir, { recursive: true });

// ---- the mark geometry (matches the picker exactly) ----
const N = 36, SCX = 18, SCY = 16, SR = 14, FR = [11, 18, 25], HY = 22, BASE = 31, HR = 2.6, S = 32;
const inDisc = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.35;
function friend(x, y) {
  for (const fx of FR) {
    if (inDisc(x, y, fx, HY, HR)) return true;
    if (y >= HY + 1 && y <= BASE) {
      const t = (y - (HY + 1)) / (BASE - (HY + 1));
      const half = 1.1 + t * 2.4;
      if (Math.abs(x - fx) <= half) return true;
    }
  }
  return false;
}
// 36x36 boolean: a sun cell that isn't a friend
const grid = [];
for (let y = 0; y < N; y++) { grid[y] = []; for (let x = 0; x < N; x++) grid[y][x] = inDisc(x, y, SCX, SCY, SR) && !friend(x, y); }

// ---- minimal PNG encoder (RGBA, no filtering) ----
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rgba)), chunk("IEND", Buffer.alloc(0))]);
}

function render(fg, bg) { // fg/bg = [r,g,b,a]
  const DIM = N * S;
  const raw = Buffer.alloc(DIM * (1 + DIM * 4));
  for (let y = 0; y < DIM; y++) {
    const rowStart = y * (1 + DIM * 4);
    raw[rowStart] = 0; // filter: none
    const gy = Math.floor(y / S);
    for (let x = 0; x < DIM; x++) {
      const on = grid[gy][Math.floor(x / S)];
      const c = on ? fg : bg;
      const p = rowStart + 1 + x * 4;
      raw[p] = c[0]; raw[p + 1] = c[1]; raw[p + 2] = c[2]; raw[p + 3] = c[3];
    }
  }
  return png(DIM, DIM, raw);
}

const BLACK = [0, 0, 0, 255], WHITE = [255, 255, 255, 255], CLEAR = [0, 0, 0, 0], CLEARW = [255, 255, 255, 0];
const jobs = [
  ["aiventure-logo-black-on-white.png", BLACK, WHITE],
  ["aiventure-logo-white-on-black.png", WHITE, BLACK],
  ["aiventure-logo-black-transparent.png", BLACK, CLEAR],
  ["aiventure-logo-white-transparent.png", WHITE, CLEARW],
];
for (const [name, fg, bg] of jobs) {
  writeFileSync(join(outDir, name), render(fg, bg));
  console.log("saved", name);
}
console.log("done ->", outDir);
