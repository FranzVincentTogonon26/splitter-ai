/**
 * Test-only helpers for the fuzz suites — never imported by app code.
 *
 * A tiny deterministic LCG keeps fuzz runs reproducible: the same seed always
 * generates the same cases, so any failure can be replayed exactly. Used by
 * `npm test` (Node's built-in test runner: `node --test lib/`).
 */

export type Rng = () => number;

/** Deterministic seeded PRNG returning floats in [0, 1). */
export function makeRng(seed: number): Rng {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** Random integer in [min, max], inclusive on both ends. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
