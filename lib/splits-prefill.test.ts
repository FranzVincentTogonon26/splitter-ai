import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makeRng, randInt } from "./fuzz.ts";
import {
  equalSplits,
  isEqualSplits,
  prefillFromSplits,
  reverseConvertSplits,
  type SplitCents,
} from "./splits.ts";
import { convertToUsd, type FxSplit } from "./fx.ts";

function makeSplits(rng: () => number, count: number, totalCents: number): SplitCents[] {
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
  return parts.map((amountCents, i) => ({ userId: `u${i}`, amountCents }));
}

describe("reverseConvertSplits", () => {
  const rng = makeRng(0x5eed);

  for (let i = 0; i < 600; i++) {
    const memberCount = randInt(rng, 1, 6);
    const nativeCents = randInt(rng, 1, 2_000_000);
    const perUsd = 0.4 + rng() * 1.6;
    const usdTotal = Math.round(nativeCents / perUsd);
    if (usdTotal < memberCount) continue;

    const usdSplits: FxSplit[] = makeSplits(rng, memberCount, usdTotal).map(
      (s) => ({ userId: s.userId, amountCents: s.amountCents }),
    );
    const native = reverseConvertSplits({ nativeAmountCents: nativeCents, usdSplits });

    it(`case ${i}: ${memberCount} members, ${nativeCents} native cents @ ${perUsd.toFixed(4)}`, () => {
      // Invariant 1: the reconstructed shares sum EXACTLY to the native total.
      const sum = native.reduce((a, s) => a + s.amountCents, 0);
      assert.equal(sum, nativeCents);

      // Invariant 2: no negative shares, every member keeps a share.
      assert.equal(native.length, memberCount);
      for (const s of native) assert.ok(s.amountCents >= 0);

      // Invariant 3: each share is within 1 cent of its exact proportional share
      // (largest-remainder guarantees ≤ 1 cent error).
      for (let k = 0; k < memberCount; k++) {
        const exact = (usdSplits[k].amountCents / usdTotal) * nativeCents;
        assert.ok(Math.abs(native[k].amountCents - exact) <= 1.0000001);
      }

      // Invariant 4: determinism.
      const again = reverseConvertSplits({ nativeAmountCents: nativeCents, usdSplits });
      assert.deepEqual(again, native);
    });
  }
});

describe("isEqualSplits", () => {
  it("recognizes an equal distribution", () => {
    const ids = ["a", "b", "c", "d"];
    assert.ok(isEqualSplits(equalSplits(100, ids), ids, 100));
    assert.ok(isEqualSplits(equalSplits(7, ids), ids, 7));
  });

  it("rejects anything custom", () => {
    const ids = ["a", "b", "c"];
    assert.ok(!isEqualSplits([{ userId: "a", amountCents: 70 }, { userId: "b", amountCents: 30 }], ["a", "b"], 100));
    // Same total but a different equal split than equalSplits() would produce.
    assert.ok(!isEqualSplits(equalSplits(100, ["x", "y", "z"]), ids, 100));
  });
});

describe("prefillFromSplits round-trip", () => {
  it("an equal split round-trips back to equal mode", () => {
    const ids = ["a", "b", "c"];
    const nativeCents = 300;
    const perUsd = 0.92;
    const native = equalSplits(nativeCents, ids);
    const usd = convertToUsd({
      nativeAmountCents: nativeCents,
      splits: native,
      perUsd,
    });
    assert.ok(usd.ok);

    const prefill = prefillFromSplits({
      nativeAmountCents: nativeCents,
      usdSplits: usd.splits,
    });
    // Equal native → near-equal USD → reverse converts to equal-ish native.
    assert.equal(prefill.mode, "equal");
    assert.deepEqual(prefill.memberIds, ids);
  });

  it("a 70/30 exact split reopens in exact mode with proportional shares", () => {
    const nativeCents = 1000;
    const perUsd = 0.85;
    const native: SplitCents[] = [
      { userId: "a", amountCents: 700 },
      { userId: "b", amountCents: 300 },
    ];
    const usd = convertToUsd({ nativeAmountCents: nativeCents, splits: native, perUsd });
    assert.ok(usd.ok);

    const prefill = prefillFromSplits({
      nativeAmountCents: nativeCents,
      usdSplits: usd.splits,
    });
    assert.equal(prefill.mode, "exact");
    assert.equal(prefill.memberIds.length, 2);
    // The exact shares sum to the native total and stay within a cent of the
    // original 70/30 split.
    const sum = Object.values(prefill.exactAmounts).reduce((a, b) => a + b, 0);
    assert.equal(sum, nativeCents);
    assert.ok(Math.abs(prefill.exactAmounts["a"] - 700) <= 1);
    assert.ok(Math.abs(prefill.exactAmounts["b"] - 300) <= 1);
  });
});
