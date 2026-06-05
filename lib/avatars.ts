// Shared avatar registry. The generated portraits live at
// /public/img/avatars/avatar-1.png … avatar-<AVATAR_COUNT>.png (see scripts/gen-avatars.mjs).
// Keep AVATAR_COUNT in sync with how many were generated.
export const AVATAR_COUNT = 36;

export function avatarPath(n: number): string {
  const i = ((n - 1) % AVATAR_COUNT + AVATAR_COUNT) % AVATAR_COUNT;
  return `/img/avatars/avatar-${i + 1}.png`;
}

// Deterministic default portrait from a name (stable + varied across people).
export function avatarFor(seed?: string): string {
  let h = 0;
  for (const c of seed ?? "?") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return avatarPath((h % AVATAR_COUNT) + 1);
}

export const ALL_AVATARS: string[] = Array.from({ length: AVATAR_COUNT }, (_, i) => avatarPath(i + 1));
