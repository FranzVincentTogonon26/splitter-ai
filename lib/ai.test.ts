import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AI_INPUT_LIMIT,
  MAX_EXPENSE_CENTS,
  sanitizeParsedExpense,
} from "./ai.ts";
import { CURRENCIES, CURRENCY_CODES } from "./currencies.ts";

test("CURRENCY_CODES mirrors CURRENCIES exactly (no drift)", () => {
  assert.deepEqual([...CURRENCY_CODES], CURRENCIES.map((c) => c.code));
});

test("accepts a well-formed model answer", () => {
  const result = sanitizeParsedExpense({
    description: "Dinner at Tsukiji",
    amount: 4500,
    currency: "JPY",
  });
  assert.ok(result.ok);
  assert.equal(result.description, "Dinner at Tsukiji");
  assert.equal(result.amountCents, 450_000); // ¥4500.00 in hundredths of yen
  assert.equal(result.currency, "JPY");
});

test("rounds fractional amounts to integer cents", () => {
  const result = sanitizeParsedExpense({
    description: "Coffee",
    amount: 4.505,
    currency: "USD",
  });
  assert.ok(result.ok);
  assert.equal(result.amountCents, 451); // 450.5 → 451 (round half up)
});

test("rejects a currency outside the supported enum", () => {
  const result = sanitizeParsedExpense({
    description: "Something odd",
    amount: 10,
    currency: "BTC",
  });
  assert.ok(!result.ok);
});

test("rejects non-positive, non-finite, and non-numeric amounts", () => {
  for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, "12"]) {
    const result = sanitizeParsedExpense({
      description: "X",
      amount,
      currency: "USD",
    });
    assert.ok(!result.ok, `amount ${String(amount)} must fail`);
  }
});

test("rejects empty and over-long descriptions", () => {
  assert.ok(!sanitizeParsedExpense({ description: "", amount: 5, currency: "USD" }).ok);
  assert.ok(
    !sanitizeParsedExpense({ description: "a".repeat(121), amount: 5, currency: "USD" })
      .ok,
  );
  assert.ok(
    sanitizeParsedExpense({ description: "a".repeat(120), amount: 5, currency: "USD" })
      .ok,
  );
});

test("trims surrounding whitespace from descriptions", () => {
  const result = sanitizeParsedExpense({
    description: "  Taxi ride  ",
    amount: 20,
    currency: "EUR",
  });
  assert.ok(result.ok);
  assert.equal(result.description, "Taxi ride");
});

test("rejects amounts above the cap", () => {
  const justOver = (MAX_EXPENSE_CENTS + 1) / 100;
  const result = sanitizeParsedExpense({
    description: "Too big",
    amount: justOver,
    currency: "USD",
  });
  assert.ok(!result.ok);

  const exactlyAt = MAX_EXPENSE_CENTS / 100;
  assert.ok(
    sanitizeParsedExpense({
      description: "At cap",
      amount: exactlyAt,
      currency: "USD",
    }).ok,
  );
});

test("rejects amounts that round down to zero", () => {
  const result = sanitizeParsedExpense({
    description: "Dust",
    amount: 0.001,
    currency: "USD",
  });
  assert.ok(!result.ok);
});

test("rejects non-object payloads entirely", () => {
  for (const raw of [null, undefined, "lunch 20", 42, []]) {
    assert.ok(!sanitizeParsedExpense(raw).ok, `${String(raw)} must fail`);
  }
});

test("AI_INPUT_LIMIT is sane for a single expense line", () => {
  assert.ok(AI_INPUT_LIMIT >= 40 && AI_INPUT_LIMIT <= 500);
});
