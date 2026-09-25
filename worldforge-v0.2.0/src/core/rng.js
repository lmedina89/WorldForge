export function hashSeed(value) {
  let n = Number(value) || 1;
  n |= 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  return (n ^ (n >>> 15)) >>> 0;
}

export function rngFromSeed(seed) {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (r, a, b) => a + (b - a) * r();
export const choose = (r, values) => values[Math.floor(r() * values.length) % values.length];
export const chance = (r, probability) => r() < probability;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
