/**
 * Unit + fuzz tests for lib/balances.ts. Run with `npm test` — Node's
 * built-in test runner executes .ts files directly via type stripping.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { balancesFromLedger } from "./balances.ts";
import type { LedgerExpense, LedgerSettlement } from "./balances.ts";
import { makeRng, randInt } from "./fuzz.ts";
import type { Rng } from "./fuzz.ts";
import { simplifyDebts } from "./simplify-debts.ts";

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

/** Fisher–Yates shuffle that never mutates the input. */
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Random member ids for a fake group. */
function randomMembers(rng: Rng): string[] {
  return Array.from({ length: randInt(rng, 2, 8) }, (_, i) => `user-${i}`);
}

/**
 * Random expense whose splits sum exactly to its total, mirroring the
 * server-side validation every real expense must pass.
 */
function randomExpense(rng: Rng, memberIds: string[]): LedgerExpense {
  const amountCents = randInt(rng, 1, 50_000);
  const paidById = pick(rng, memberIds);
  const sharers = memberIds.filter(() => rng() < 0.75);
  if (sharers.length === 0) sharers.push(pick(rng, memberIds));

  const weights = sharers.map(() => rng() + 0.01);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const splits = sharers.map((userId, i) => ({
    userId,
    amountCents: Math.floor((weights[i] / weightSum) * amountCents),
  }));
  // Hand the rounding remainder to one sharer so the sum is exact.
  const assigned = splits.reduce((sum, s) => sum + s.amountCents, 0);
  splits[randInt(rng, 0, splits.length - 1)].amountCents +=
    amountCents - assigned;
  return { paidById, amountCents, splits };
}

/** Random settlement between two distinct members. */
function randomSettlement(
  rng: Rng,
  memberIds: string[],
): LedgerSettlement {
  const fromUserId = pick(rng, memberIds);
  let toUserId = pick(rng, memberIds);
  while (toUserId === fromUserId) toUserId = pick(rng, memberIds);
  return { fromUserId, toUserId, amountCents: randInt(rng, 1, 20_000) };
}

function randomLedger(rng: Rng): {
  memberIds: string[];
  expenses: LedgerExpense[];
  settlements: LedgerSettlement[];
} {
  const memberIds = randomMembers(rng);
  return {
    memberIds,
    expenses: Array.from({ length: randInt(rng, 0, 20) }, () =>
      randomExpense(rng, memberIds),
    ),
    settlements: Array.from({ length: randInt(rng, 0, 5) }, () =>
      randomSettlement(rng, memberIds),
    ),
  };
}

test("empty ledger: everyone starts at zero", () => {
  const balances = balancesFromLedger(["a", "b", "c"], [], []);
  assert.deepEqual(Object.fromEntries(balances), { a: 0, b: 0, c: 0 });
});

test("expense: payer credited the total, sharers debited their share", () => {
  const balances = balancesFromLedger(
    ["alice", "bob", "carol"],
    [
      {
        paidById: "alice",
        amountCents: 30_00,
        splits: [
          { userId: "alice", amountCents: 10_00 },
          { userId: "bob", amountCents: 10_00 },
          { userId: "carol", amountCents: 10_00 },
        ],
      },
    ],
    [],
  );
  assert.deepEqual(Object.fromEntries(balances), {
    alice: 20_00,
    bob: -10_00,
    carol: -10_00,
  });
});

test("settlement: sender credited, receiver debited", () => {
  const balances = balancesFromLedger(
    ["alice", "bob"],
    [],
    [{ fromUserId: "bob", toUserId: "alice", amountCents: 5_00 }],
  );
  assert.deepEqual(Object.fromEntries(balances), {
    alice: -5_00,
    bob: 5_00,
  });
});

test("fuzz: balances always sum to zero", () => {
  const rng = makeRng(20260831);
  for (let i = 0; i < 500; i++) {
    const { memberIds, expenses, settlements } = randomLedger(rng);
    const balances = balancesFromLedger(memberIds, expenses, settlements);
    const sum = [...balances.values()].reduce((a, b) => a + b, 0);
    assert.equal(
      sum,
      0,
      `case ${i}: ${JSON.stringify({ expenses, settlements })}`,
    );
  }
});

test("fuzz: record order never changes balances", () => {
  const rng = makeRng(42);
  const shuffler = makeRng(777);
  for (let i = 0; i < 200; i++) {
    const { memberIds, expenses, settlements } = randomLedger(rng);
    const a = balancesFromLedger(memberIds, expenses, settlements);
    const b = balancesFromLedger(
      memberIds,
      shuffled(expenses, shuffler),
      shuffled(settlements, shuffler),
    );
    assert.deepEqual(Object.fromEntries(b), Object.fromEntries(a));
  }
});

test("fuzz: simplified payments fully settle every ledger", () => {
  const rng = makeRng(1234);
  for (let i = 0; i < 500; i++) {
    const { memberIds, expenses, settlements } = randomLedger(rng);
    const balances = balancesFromLedger(memberIds, expenses, settlements);

    const after = new Map(balances);
    for (const d of simplifyDebts(balances)) {
      after.set(d.fromUserId, (after.get(d.fromUserId) ?? 0) + d.amountCents);
      after.set(d.toUserId, (after.get(d.toUserId) ?? 0) - d.amountCents);
    }
    for (const [id, cents] of after) {
      assert.equal(cents, 0, `case ${i}: ${id} left at ${cents}`);
    }
  }
});
