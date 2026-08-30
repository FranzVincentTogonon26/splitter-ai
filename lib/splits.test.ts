/**
 * Unit + fuzz tests for lib/splits.ts. Run with `npm test` — Node's built-in
 * test runner executes .ts files directly via type stripping.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { makeRng, randInt } from "./fuzz.ts";
import type { Rng } from "./fuzz.ts";
import {
  computeSplits,
  equalSplits,
  percentageSplits,
  splitsFromFormData,
} from "./splits.ts";

const GROUP = ["alice", "bob", "carol", "dave"];

type SplitRequest = Parameters<typeof computeSplits>[0];

/** Compute splits that must succeed, failing with the server's error. */
function mustSplits(input: SplitRequest) {
  const result = computeSplits(input);
  if (!result.ok) assert.fail(`expected ok, got: ${result.error}`);
  return result.splits;
}

function errorOf(input: SplitRequest): string {
  const result = computeSplits(input);
  if (result.ok) assert.fail("expected an error, got ok");
  return result.error;
}

test("equal: splits sum exactly, extra cents go to the first members", () => {
  assert.deepEqual(equalSplits(100_00, ["a", "b", "c"]), [
    { userId: "a", amountCents: 3334 },
    { userId: "b", amountCents: 3333 },
    { userId: "c", amountCents: 3333 },
  ]);
});

test("equal: total smaller than the member count", () => {
  assert.deepEqual(equalSplits(2, ["a", "b", "c"]), [
    { userId: "a", amountCents: 1 },
    { userId: "b", amountCents: 1 },
    { userId: "c", amountCents: 0 },
  ]);
});

test("equal: single member takes the whole expense", () => {
  assert.deepEqual(equalSplits(12_34, ["a"]), [
    { userId: "a", amountCents: 1234 },
  ]);
});

test("percentage: 33.33 x3 is accepted despite IEEE 754 error", () => {
  const splits = mustSplits({
    amountCents: 100_00,
    memberIds: ["alice", "bob", "carol"],
    allowedIds: GROUP,
    mode: "percentage",
    percentages: { alice: 33.33, bob: 33.33, carol: 33.34 },
  });
  assert.equal(
    splits.reduce((sum, s) => sum + s.amountCents, 0),
    100_00,
  );
});

test("percentage: leftover cents go to the largest fractional remainder", () => {
  // 33 + 33 + 34 percent of 101 cents -> floors 33/33/34, one cent left, c
  // has the largest remainder (0.34), so c takes it.
  assert.deepEqual(
    percentageSplits(101, ["a", "b", "c"], { a: 33, b: 33, c: 34 }),
    [
      { userId: "a", amountCents: 33 },
      { userId: "b", amountCents: 33 },
      { userId: "c", amountCents: 35 },
    ],
  );
});

test("percentage: ties break by member order", () => {
  assert.deepEqual(percentageSplits(101, ["a", "b"], { a: 50, b: 50 }), [
    { userId: "a", amountCents: 51 },
    { userId: "b", amountCents: 50 },
  ]);
});

test("percentage: a 0% member owes nothing", () => {
  assert.deepEqual(percentageSplits(500, ["a", "b"], { a: 100, b: 0 }), [
    { userId: "a", amountCents: 500 },
    { userId: "b", amountCents: 0 },
  ]);
});

test("exact: passes through integer cents that sum to the total", () => {
  const splits = mustSplits({
    amountCents: 10_000,
    memberIds: ["alice", "bob"],
    allowedIds: GROUP,
    mode: "exact",
    exactCents: { alice: 1234, bob: 8766 },
  });
  assert.deepEqual(splits, [
    { userId: "alice", amountCents: 1234 },
    { userId: "bob", amountCents: 8766 },
  ]);
});

test("exact: a zero share is allowed", () => {
  const splits = mustSplits({
    amountCents: 10_000,
    memberIds: ["alice", "bob"],
    allowedIds: GROUP,
    mode: "exact",
    exactCents: { alice: 10_000, bob: 0 },
  });
  assert.deepEqual(splits, [
    { userId: "alice", amountCents: 10_000 },
    { userId: "bob", amountCents: 0 },
  ]);
});

test("validation: rejects non-positive or non-integer totals", () => {
  assert.equal(
    errorOf({
      amountCents: 0,
      memberIds: ["alice"],
      allowedIds: GROUP,
      mode: "equal",
    }),
    "Enter an amount greater than 0",
  );
  assert.equal(
    errorOf({
      amountCents: 12.5,
      memberIds: ["alice"],
      allowedIds: GROUP,
      mode: "equal",
    }),
    "Enter an amount greater than 0",
  );
});

test("validation: rejects an empty member selection", () => {
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: [],
      allowedIds: GROUP,
      mode: "equal",
    }),
    "Select at least one member",
  );
});

test("validation: rejects sharers outside the group", () => {
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["eve"],
      allowedIds: GROUP,
      mode: "equal",
    }),
    "Select group members only",
  );
});

test("validation: rejects duplicate sharers", () => {
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["alice", "alice"],
      allowedIds: GROUP,
      mode: "equal",
    }),
    "Select each member once",
  );
});

test("validation: rejects unknown split modes", () => {
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["alice"],
      allowedIds: GROUP,
      mode: "unknown",
    }),
    "Choose a split type",
  );
});

test("validation: rejects percentages that don't add up to 100", () => {
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "percentage",
      percentages: { alice: 50, bob: 40 },
    }),
    "Percentages must add up to 100%",
  );
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "percentage",
      percentages: { alice: 50.000001, bob: 50 },
    }),
    "Percentages must add up to 100%",
  );
});

test("validation: rejects missing, out-of-range, or NaN percentages", () => {
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "percentage",
      percentages: { alice: 100 },
    }),
    "Enter a percentage for every member",
  );
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "percentage",
      percentages: { alice: -1, bob: 101 },
    }),
    "Invalid percentage",
  );
  assert.equal(
    errorOf({
      amountCents: 100,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "percentage",
      percentages: { alice: Number.NaN, bob: 100 },
    }),
    "Invalid percentage",
  );
});

test("validation: rejects exact drift of a single cent", () => {
  assert.equal(
    errorOf({
      amountCents: 10_000,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "exact",
      exactCents: { alice: 1234, bob: 8767 },
    }),
    "Amounts must add up to the total",
  );
});

test("validation: rejects non-integer, negative, or missing exact cents", () => {
  assert.equal(
    errorOf({
      amountCents: 10_000,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "exact",
      exactCents: { alice: 12.5, bob: 9987.5 },
    }),
    "Invalid amount",
  );
  assert.equal(
    errorOf({
      amountCents: 10_000,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "exact",
      exactCents: { alice: -1, bob: 10_001 },
    }),
    "Invalid amount",
  );
  assert.equal(
    errorOf({
      amountCents: 10_000,
      memberIds: ["alice", "bob"],
      allowedIds: GROUP,
      mode: "exact",
      exactCents: { alice: 10_000 },
    }),
    "Enter an amount for every member",
  );
});

test("splitsFromFormData: round-trips what the expense modal submits", () => {
  const fd = new FormData();
  fd.set("splitMode", "percentage");
  fd.append("members", "carol");
  fd.append("members", "alice");
  fd.set("percentage-carol", "60");
  fd.set("percentage-alice", "40");

  const parsed = splitsFromFormData(fd);
  assert.equal(parsed.mode, "percentage");
  assert.deepEqual(parsed.memberIds, ["carol", "alice"]);
  assert.deepEqual(parsed.percentages, { carol: 60, alice: 40 });

  const splits = mustSplits({
    amountCents: 100_00,
    memberIds: parsed.memberIds,
    allowedIds: GROUP,
    mode: parsed.mode,
    percentages: parsed.percentages,
  });
  assert.deepEqual(splits, [
    { userId: "carol", amountCents: 6000 },
    { userId: "alice", amountCents: 4000 },
  ]);
});

test("splitsFromFormData: absent mode parses as unknown", () => {
  const fd = new FormData();
  fd.append("members", "alice");
  const parsed = splitsFromFormData(fd);
  assert.equal(parsed.mode, "unknown");
  assert.deepEqual(parsed.memberIds, ["alice"]);
});

/** Random partition of `total` into `n` non-negative integer parts. */
function randomPartition(rng: Rng, total: number, n: number): number[] {
  const cuts = Array.from({ length: n - 1 }, () => randInt(rng, 0, total)).sort(
    (a, b) => a - b,
  );
  const parts: number[] = [];
  let prev = 0;
  for (const cut of cuts) {
    parts.push(cut - prev);
    prev = cut;
  }
  parts.push(total - prev);
  return parts;
}

const FUZZ_MODES = ["equal", "percentage", "exact"] as const;
type FuzzMode = (typeof FUZZ_MODES)[number];

test("fuzz: every mode produces splits summing exactly to the total", () => {
  const rng = makeRng(20260901);
  for (let i = 0; i < 600; i++) {
    const memberIds = Array.from(
      { length: randInt(rng, 1, 8) },
      (_, k) => `user-${k}`,
    );
    const amountCents = randInt(rng, 1, 50_000);
    const mode: FuzzMode = FUZZ_MODES[randInt(rng, 0, FUZZ_MODES.length - 1)];

    let percentages: Record<string, number> | undefined;
    let exactCents: Record<string, number> | undefined;
    if (mode === "percentage") {
      const weights = memberIds.map(() => rng() + 0.01);
      const sumW = weights.reduce((a, b) => a + b, 0);
      percentages = Object.fromEntries(
        memberIds.map((id, k) => [id, (weights[k] / sumW) * 100]),
      );
    } else if (mode === "exact") {
      const parts = randomPartition(rng, amountCents, memberIds.length);
      exactCents = Object.fromEntries(
        memberIds.map((id, k) => [id, parts[k]]),
      );
    }

    const result = computeSplits({
      amountCents,
      memberIds,
      allowedIds: memberIds,
      mode,
      percentages,
      exactCents,
    });
    if (!result.ok) {
      assert.fail(`case ${i} (${mode}): ${result.error}`);
    }

    // Sum exactness — the invariant that keeps group balances at zero.
    assert.equal(
      result.splits.reduce((sum, s) => sum + s.amountCents, 0),
      amountCents,
      `case ${i} (${mode})`,
    );
    // Shares are never negative, and every sharer appears exactly once.
    for (const s of result.splits) {
      assert.ok(s.amountCents >= 0, `case ${i} (${mode}): ${s.userId}`);
    }
    assert.equal(
      new Set(result.splits.map((s) => s.userId)).size,
      result.splits.length,
      `case ${i} (${mode}): duplicate sharers`,
    );
    // Pure function: identical input, identical output.
    assert.deepEqual(
      computeSplits({
        amountCents,
        memberIds,
        allowedIds: memberIds,
        mode,
        percentages,
        exactCents,
      }),
      result,
      `case ${i} (${mode}): nondeterministic`,
    );
  }
});