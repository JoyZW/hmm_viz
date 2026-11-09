// Seeded simulation of a toss sequence. PURE.

/** mulberry32: small, fast 32-bit seeded PRNG; identical output on every JS engine. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sample a coin path from the starting / transition probabilities, then each toss
 * from the emission probabilities.
 * @returns {{tosses: number[], truePath: number[]}}
 */
export function simulate(params, n, seed) {
  const rng = mulberry32(seed);
  const tosses = new Array(n);
  const truePath = new Array(n);
  let s = 0;
  for (let t = 0; t < n; t++) {
    const pF = t === 0 ? params.start[0] : params.trans[s][0];
    s = rng() < pF ? 0 : 1;
    truePath[t] = s;
    tosses[t] = rng() < params.emit[s][0] ? 0 : 1;
  }
  return { tosses, truePath };
}

/** A fresh random seed for the "New seed" button. */
export function randomSeed(rand = Math.random) {
  return Math.floor(rand() * 1_000_000);
}
