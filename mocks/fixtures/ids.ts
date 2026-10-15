// Deterministic ids and randomness for fixtures, so the mock world is identical on every reload
// (URLs like /notes/<id> keep working across dev-server restarts).

/** 32-bit FNV-1a hash with a seed. */
function hash(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Stable RFC-4122 v4-shaped UUID derived from a key, e.g. mockId("subject:CS301"). */
export function mockId(key: string): string {
  const hex = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
    .map((seed) => hash(key, seed).toString(16).padStart(8, "0"))
    .join("");
  const variant = (8 + (parseInt(hex[16], 16) & 3)).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Seeded PRNG (mulberry32). Same seed → same sequence. */
export function createRandom(seed: string) {
  let state = hash(seed, 0x811c9dc5);
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (probability: number) => next() < probability,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    between: (min: number, max: number) => min + next() * (max - min),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    shuffle: <T>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export type Random = ReturnType<typeof createRandom>;
