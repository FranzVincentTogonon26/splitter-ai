import { z } from "zod";

import { CURRENCY_CODES } from "./currencies.ts";

/**
 * AI quick-add — the pure, testable half of phase 08.
 *
 * The model (claude-sonnet-4-5, via app/actions/ai.ts) returns a raw
 * {description, amount, currency}; it NEVER does money math. Everything
 * deterministic — validation, rounding to integer cents, caps — happens here
 * in server code, mirroring the "AI does language understanding only"
 * architecture invariant.
 */

/** How much free text the model is asked to read (one expense, not a novel). */
export const AI_INPUT_LIMIT = 280;

/** The largest expense the AI path may produce: $100,000.00 in cents. */
export const MAX_EXPENSE_CENTS = 10_000_000;

/** The instruction block sent ahead of the user's free text. */
export const AI_PARSE_PROMPT = [
  "Extract ONE expense from the text below.",
  "Reply with JSON matching the schema exactly:",
  '- description: short human label (max 120 characters), e.g. "Dinner at Tsukiji"',
  "- amount: the total AS WRITTEN — copy the number, never convert, never",
  "  calculate, never sum multiple numbers",
  "- currency: the ISO code from the text; if none is mentioned, use USD",
].join("\n");

/**
 * The structured-output contract for the model. Loose enough for natural
 * language (positive finite number, any supported currency), strict enough
 * that sanitizeParsedExpense can finish the job deterministically.
 */
export const ParsedExpenseSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount: z.number().finite().positive(),
  currency: z.enum(CURRENCY_CODES),
});

export type ParsedExpense = z.infer<typeof ParsedExpenseSchema>;

export type SanitizedExpense =
  | { ok: true; description: string; amountCents: number; currency: string }
  | { ok: false; error: string };

/**
 * Validate the model's raw output and turn it into ledger-ready integer
 * cents. This is the ONLY place the AI's number becomes money — with the
 * same Math.round-to-cents policy as manual entry. Rejects anything the
 * schema dislikes, non-positive totals after rounding, and amounts over
 * MAX_EXPENSE_CENTS.
 */
export function sanitizeParsedExpense(raw: unknown): SanitizedExpense {
  const parsed = ParsedExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Model output failed validation" };
  }

  const { description, amount, currency } = parsed.data;
  const amountCents = Math.round(amount * 100);
  if (amountCents <= 0) {
    return { ok: false, error: "Amount rounds to zero" };
  }
  if (amountCents > MAX_EXPENSE_CENTS) {
    return { ok: false, error: "Amount is unrealistically large" };
  }

  return { ok: true, description, amountCents, currency };
}