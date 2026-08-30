/**
 * Unit + fuzz tests for lib/simplify-debts.ts. Run with `npm test` —
 * Node's built-in test runner executes .ts files directly via type
 * stripping.
 *
 * The fuzz suite proves the phase guarantee: the greedy matcher settles
 * any zero-sum balance map in at most (nonzero members − 1) payments,
 * with positive amounts, real members, and full debt conservation.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { makeRng, randInt } from "./fuzz.ts";
import type { Rng } from "./fuzz.ts";
import { simplifyDebts } from "./simplify-debts.ts";

/** Random zero-sum balance map over 2–8 members. */
function randomBalances(rng: Rng): Map<string, number> {
  const n = randInt(rng, 2, 8);
  const ids = Array.from({ length: n }, (_, i) => `user-${i}`);
  const cents = ids.map(() => randInt(rng, -10_000, 10_000));
  // Adjust one member so the map always sums to exactly zero.
  cents[randInt(rng, 0, n - 1)] -= cents.reduce((a, b) => a + b, 0);
  return new Map(ids.map((id, i) => [id, cents[i]] as const));
}

test("all settled: no payments", () => {
  assert.deepEqual(simplifyDebts(new Map([["a", 0], ["b", 0]])), []);
});

test("pair: a single payment", () => {
  assert.deepEqual(
    simplifyDebts(new Map([["a", -1_000], ["b", 1_000]])),
    [{ fromUserId: "a", toUserId: "b", amountCents: 1_000 }],
  );
});

test("largest debtor pays the largest creditor first", () => {
  assert.deepEqual(
    simplifyDebts(new Map([["a", 300], ["b", -100], ["c", -200]])),
    [
      { fromUserId: "c", toUserId: "a", amountCents: 200 },
      { fromUserId: "b", toUserId: "a", amountCents: 100 },
    ],
  );
});

test("deterministic: same input, same output", () => {
  const balances = new Map([["a", -500], ["b", 500]]);
  assert.deepEqual(simplifyDebts(balances), simplifyDebts(balances));
});

test("fuzz: correct, minimal, and within the n−1 bound", () => {
  const rng = makeRng(2026);
  for (let i = 0; i < 1_000; i++) {
    const balances = randomBalances(rng);
    const debts = simplifyDebts(balances);

    // ≤ (nonzero members − 1) payments — the minimization guarantee.
    const nonzero = [...balances.values()].filter((c) => c !== 0).length;
    assert.ok(
      debts.length <= Math.max(0, nonzero - 1),
      `case ${i}: ${debts.length} payments for ${nonzero} nonzero members`,
    );

    // Total suggested debt equals the total actually owed — nothing
    // invented, nothing lost.
    const totalOwed = [...balances.values()].reduce(
      (sum, c) => sum + Math.min(0, c),
      0,
    );
    assert.equal(
      debts.reduce((sum, d) => sum + d.amountCents, 0),
      -totalOwed,
      `case ${i}: debt not conserved`,
    );

    // Paying every suggestion zeroes everyone out.
    const after = new Map(balances);
    for (const d of debts) {
      assert.ok(d.amountCents > 0, `case ${i}: non-positive amount`);
      assert.notEqual(d.fromUserId, d.toUserId, `case ${i}: self-payment`);
      assert.ok(
        balances.has(d.fromUserId) && balances.has(d.toUserId),
        `case ${i}: payment involving a non-member`,
      );
      after.set(d.fromUserId, (after.get(d.fromUserId) ?? 0) + d.amountCents);
      after.set(d.toUserId, (after.get(d.toUserId) ?? 0) - d.amountCents);
    }
    for (const [id, cents] of after) {
      assert.equal(cents, 0, `case ${i}: ${id} left at ${cents}`);
    }
  }
});
