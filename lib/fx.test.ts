import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makeRng, randInt } from "./fuzz.ts";
import {
  convertToUsd,
  displayCents,
  perUsdFor,
  type FxSplit,
} from "./fx.ts";

function makeSplits(rng: () => number, count: number, totalCents: number): FxSplit[] {
  // Random non-negative split of totalCents into `count` parts (exact sum).
  const cuts: number[] = [];
  for (let i = 0; i < count - 1; i++) cuts.push(randInt(rng, 0, totalCents));
  cuts.sort((a, b) => a - b);
  const parts: number[] = [];
  let prev = 0;
  for (const cut of cuts) {
    parts.push(cut - prev);
    prev = cut;
  }
  parts.push(totalCents - prev);
  return parts.map((amountCents, i) => ({
    userId: `u${i}`,
    amountCents,
  }));
}

describe("perUsdFor", () => {
  it("USD is always 1, regardless of rates", () => {
    assert.equal(perUsdFor(null, "USD"), 1);
    assert.equal(perUsdFor({ EUR: 0.9 }, "USD"), 1);
  });

  it("returns null when rates are unavailable or the code is missing", () => {
    assert.equal(perUsdFor(null, "EUR"), null);
    assert.equal(perUsdFor({}, "EUR"), null);
    assert.equal(perUsdFor({ EUR: 0.9 }, "XYZ"), null);
  });

  it("rejects non-finite and non-positive rates", () => {
    assert.equal(perUsdFor({ EUR: 0 }, "EUR"), null);
    assert.equal(perUsdFor({ EUR: -1 }, "EUR"), null);
    assert.equal(perUsdFor({ EUR: Number.NaN }, "EUR"), null);
    assert.equal(perUsdFor({ EUR: Number.POSITIVE_INFINITY }, "EUR"), null);
  });
});

describe("displayCents", () => {
  it("rounds USD cents to display cents", () => {
    assert.equal(displayCents(100, 0.9), 90);
    assert.equal(displayCents(100, 2), 200);
    assert.equal(displayCents(101, 0.5), 51); // 50.5 → 51 (round half up)
    assert.equal(displayCents(0, 1.5), 0);
  });
});

describe("convertToUsd", () => {
  it("is the identity at perUsd = 1", () => {
    const splits: FxSplit[] = [
      { userId: "a", amountCents: 333 },
      { userId: "b", amountCents: 667 },
    ];
    const result = convertToUsd({
      nativeAmountCents: 1000,
      splits,
      perUsd: 1,
    });
    assert.ok(result.ok);
    assert.equal(result.amountCents, 1000);
    assert.deepEqual(result.splits, splits);
  });

  it("fails cleanly on unavailable rates", () => {
    const result = convertToUsd({
      nativeAmountCents: 1000,
      splits: [{ userId: "a", amountCents: 1000 }],
      perUsd: null,
    });
    assert.ok(!result.ok);
  });

  it("fails cleanly on amounts too small to convert", () => {
    // 1 unit-cent at 500 per USD → 0.002 USD cents → rounds to 0.
    const result = convertToUsd({
      nativeAmountCents: 1,
      splits: [{ userId: "a", amountCents: 1 }],
      perUsd: 500,
    });
    assert.ok(!result.ok);
  });

  it("converts a simple EUR expense exactly", () => {
    // €92.00 at 0.92 per USD → $100.00; split 50/50 → 5000 + 5000.
    const result = convertToUsd({
      nativeAmountCents: 9200,
      splits: [
        { userId: "a", amountCents: 4600 },
        { userId: "b", amountCents: 4600 },
      ],
      perUsd: 0.92,
    });
    assert.ok(result.ok);
    assert.equal(result.amountCents, 10000);
    assert.deepEqual(result.splits, [
      { userId: "a", amountCents: 5000 },
      { userId: "b", amountCents: 5000 },
    ]);
  });
});

describe("convertToUsd fuzz — 600 random conversions", () => {
  const rng = makeRng(0xc0ffee);

  for (let i = 0; i < 600; i++) {
    const memberCount = randInt(rng, 1, 8);
    const nativeCents = randInt(rng, 1, 5_000_000);
    // Skip degenerate cases where the converted total rounds to 0.
    const perUsd = 0.4 + rng() * 1.6;
    if (Math.round(nativeCents / perUsd) < memberCount) continue;

    const splits = makeSplits(rng, memberCount, nativeCents);
    const result = convertToUsd({ nativeAmountCents: nativeCents, splits, perUsd });

    // Some cases legitimately fail the min-size check above — re-check here.
    if (!result.ok) {
      assert.equal(
        Math.round(nativeCents / perUsd),
        0,
        `case ${i}: only the zero-total case may fail`,
      );
      continue;
    }

    const exactTotal = Math.round(nativeCents / perUsd);

    it(`case ${i}: ${memberCount} members, ${nativeCents} native cents @ ${perUsd.toFixed(4)}`, () => {
      // Invariant 1: splits sum EXACTLY to the converted total.
      const sum = result.splits.reduce((a, s) => a + s.amountCents, 0);
      assert.equal(sum, exactTotal);

      // Invariant 2: the converted total matches the native total conversion.
      assert.equal(result.amountCents, exactTotal);

      // Invariant 3: no negative shares; every member keeps a share.
      for (const s of result.splits) {
        assert.ok(s.amountCents >= 0);
      }
      assert.equal(result.splits.length, memberCount);

      // Invariant 4: proportionality — each share is within 1 cent of the
      // exact proportional share (largest-remainder guarantees ≤ 1 cent).
      for (let k = 0; k < memberCount; k++) {
        const exact = (splits[k].amountCents / nativeCents) * exactTotal;
        assert.ok(
          Math.abs(result.splits[k].amountCents - exact) <= 1.0000001,
          `share ${k}: ${result.splits[k].amountCents} vs exact ${exact}`,
        );
      }

      // Invariant 5: determinism — same input, same output.
      const again = convertToUsd({ nativeAmountCents: nativeCents, splits, perUsd });
      assert.deepEqual(again, result);
    });
  }
});
