// Friendly, shareable plan slugs like "wild-otter-42"
const ADJ = [
  "wild", "sunny", "cosy", "brave", "merry", "lush", "swift", "golden",
  "breezy", "rowdy", "gentle", "epic", "mellow", "zesty", "rugged", "bright",
];
const NOUN = [
  "otter", "summit", "trail", "meadow", "harbour", "campfire", "lagoon",
  "ridge", "falcon", "pebble", "thicket", "glade", "comet", "willow", "fjord",
];

// deterministic-ish without Math.random (which is unavailable in some sandboxes):
// caller passes a seed (e.g. Date.now from the request or a uuid fragment).
export function planSlug(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const adj = ADJ[h % ADJ.length];
  const noun = NOUN[(h >>> 8) % NOUN.length];
  const num = ((h >>> 16) % 90) + 10; // 10–99
  return `${adj}-${noun}-${num}`;
}
