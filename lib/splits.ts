/**
 * Pure split computation + validation — the single source of truth for how
 * an expense divides across members. addExpense (phase 06) and updateExpense
 * (phase 12) both funnel through computeSplits, so an edit is a full
 * re-entry with identical validation, never a partial update.
 *
 * The client's live preview is a convenience only: the server always
 * re-derives integer-cent splits from the raw inputs, and the result is
 * guaranteed to sum EXACTLY to the expense total (invariant: money is
 * integer cents, never floats).
 */

export type SplitMode = "equal" | "percentage" | "exact";

export const SPLIT_MODES: readonly SplitMode[] = [
  "equal",
  "percentage",
  "exact",
];

export type SplitCents = { userId: string; amountCents: number };

export type SplitInput = {
  /** Expense total in integer cents (must be positive). */
  amountCents: number;
  /** Members selected to share the expense (dupes/non-members rejected). */
  memberIds: readonly string[];
  /** Full group membership — sharers must be a subset of it. */
  allowedIds: readonly string[];
  mode: SplitMode | "unknown";
  /** Percentage per selected member, 0–100 with decimals. */
  percentages?: Readonly<Record<string, number>>;
  /** Share per selected member, in integer cents. */
  exactCents?: Readonly<Record<string, number>>;
};

export type SplitsResult =
  | { ok: true; splits: SplitCents[] }
  | { ok: false; error: string };

/**
 * Equal split with exact-sum reconciliation: the first `total % n` members
 * (in the order given — the client sends display order) pay one cent extra.
 */
export function equalSplits(
  amountCents: number,
  memberIds: readonly string[],
): SplitCents[] {
  const n = memberIds.length;
  const base = Math.floor(amountCents / n);
  let remainder = amountCents - base * n;
  return memberIds.map((userId) => {
    const share = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { userId, amountCents: share };
  });
}

/**
 * Percentage split via largest-remainder apportionment: floor every share,
 * then hand the leftover cents to the members with the largest fractional
 * remainders (member order breaks ties). The result always sums exactly to
 * `amountCents`. Inputs must already be validated (sum ≈ 100).
 */
export function percentageSplits(
  amountCents: number,
  memberIds: readonly string[],
  percentages: Readonly<Record<string, number>>,
): SplitCents[] {
  const exactShares = memberIds.map(
    (userId) => (amountCents * percentages[userId]) / 100,
  );
  const shares = exactShares.map((v) => Math.floor(v));
  let leftover = amountCents - shares.reduce((a, b) => a + b, 0);

  // Fractional remainder, largest first; a stable sort keeps member order on
  // ties so identical inputs always produce identical splits.
  const byRemainder = memberIds
    .map((_, i) => i)
    .sort((a, b) => exactShares[b] % 1 - (exactShares[a] % 1));
  for (let k = 0; leftover > 0; k++, leftover--) {
    shares[byRemainder[k % byRemainder.length]] += 1;
  }

  return memberIds.map((userId, i) => ({ userId, amountCents: shares[i] }));
}

function percentageError(
  memberIds: readonly string[],
  percentages: Readonly<Record<string, number>>,
): string | null {
  let total = 0;
  for (const id of memberIds) {
    const pct = percentages[id];
    if (pct === undefined) return "Enter a percentage for every member";
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return "Invalid percentage";
    }
    total += pct;
  }
  // Float-safe equality: user-typed decimals like 33.33 x3 land within ~1e-14
  // of 100 in IEEE 754; anything past 1e-9 is a genuinely wrong sum.
  if (Math.abs(total - 100) > 1e-9) return "Percentages must add up to 100%";
  return null;
}

function exactError(
  memberIds: readonly string[],
  exactCents: Readonly<Record<string, number>>,
  amountCents: number,
): string | null {
  let total = 0;
  for (const id of memberIds) {
    const cents = exactCents[id];
    if (cents === undefined) return "Enter an amount for every member";
    if (!Number.isInteger(cents) || cents < 0) return "Invalid amount";
    total += cents;
  }
  if (total !== amountCents) return "Amounts must add up to the total";
  return null;
}

/**
 * Validate a split request and derive its integer-cent shares. All checks run
 * server-side; the client's disabled Save button is UX, not security.
 */
export function computeSplits(input: SplitInput): SplitsResult {
  const { amountCents, memberIds, allowedIds, mode } = input;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, error: "Enter an amount greater than 0" };
  }
  if (memberIds.length === 0) {
    return { ok: false, error: "Select at least one member" };
  }
  const allowed = new Set(allowedIds);
  if (memberIds.some((id) => !allowed.has(id))) {
    return { ok: false, error: "Select group members only" };
  }
  if (new Set(memberIds).size !== memberIds.length) {
    return { ok: false, error: "Select each member once" };
  }

  let splits: SplitCents[];
  switch (mode) {
    case "equal":
      splits = equalSplits(amountCents, memberIds);
      break;
    case "percentage": {
      const percentages = input.percentages ?? {};
      const error = percentageError(memberIds, percentages);
      if (error) return { ok: false, error };
      splits = percentageSplits(amountCents, memberIds, percentages);
      break;
    }
    case "exact": {
      const exactCents = input.exactCents ?? {};
      const error = exactError(memberIds, exactCents, amountCents);
      if (error) return { ok: false, error };
      splits = memberIds.map((userId) => ({
        userId,
        amountCents: exactCents[userId],
      }));
      break;
    }
    default:
      return { ok: false, error: "Choose a split type" };
  }

  // Defense in depth: a violation here is a bug in this module, never a
  // client problem — refuse to write splits that don't reconcile.
  const sum = splits.reduce((s, x) => s + x.amountCents, 0);
  if (sum !== amountCents) return { ok: false, error: "Splits do not add up" };

  return { ok: true, splits };
}

/**
 * Extract the split request the expense modal submits: `splitMode`, repeated
 * `members` entries, and per-member `percentage-<userId>` / `exact-<userId>`
 * values. Shared by addExpense and (phase 12) updateExpense so both parse
 * identically.
 */
export function splitsFromFormData(formData: FormData): {
  mode: SplitMode | "unknown";
  memberIds: string[];
  percentages: Record<string, number>;
  exactCents: Record<string, number>;
} {
  const rawMode = String(formData.get("splitMode") ?? "");
  const mode: SplitMode | "unknown" = SPLIT_MODES.includes(rawMode as SplitMode)
    ? (rawMode as SplitMode)
    : "unknown";

  const memberIds = formData.getAll("members").map(String);
  const percentages: Record<string, number> = {};
  const exactCents: Record<string, number> = {};
  for (const id of memberIds) {
    const pct = formData.get(`percentage-${id}`);
    if (pct !== null) percentages[id] = Number(pct);
    const exact = formData.get(`exact-${id}`);
    if (exact !== null) exactCents[id] = Number(exact);
  }
  return { mode, memberIds, percentages, exactCents };
}

/**
 * Phase 12 edit prefill — the reverse of convertToUsd (lib/fx.ts): stored
 * USD splits are projected back onto the entered-currency total with the
 * same proportional largest-remainder apportionment, so the reconstructed
 * shares sum EXACTLY to nativeAmountCents (never floats, never drift).
 */
export function reverseConvertSplits(input: {
  nativeAmountCents: number;
  usdSplits: readonly SplitCents[];
}): SplitCents[] {
  const { nativeAmountCents, usdSplits } = input;
  const usdTotal = usdSplits.reduce((a, s) => a + s.amountCents, 0);
  if (usdSplits.length === 0 || usdTotal <= 0 || nativeAmountCents <= 0) {
    return usdSplits.map((s) => ({ userId: s.userId, amountCents: 0 }));
  }

  const exactShares = usdSplits.map(
    (s) => (s.amountCents / usdTotal) * nativeAmountCents,
  );
  const shares = exactShares.map((v) => Math.floor(v));
  let leftover = nativeAmountCents - shares.reduce((a, b) => a + b, 0);
  const byRemainder = exactShares
    .map((_, i) => i)
    .sort((a, b) => (exactShares[b] % 1) - (exactShares[a] % 1));
  for (let k = 0; leftover > 0; k++, leftover--) {
    shares[byRemainder[k % byRemainder.length]] += 1;
  }

  return usdSplits.map((s, i) => ({ userId: s.userId, amountCents: shares[i] }));
}

/** True when `splits` is exactly the deterministic equal distribution. */
export function isEqualSplits(
  splits: readonly SplitCents[],
  memberIds: readonly string[],
  amountCents: number,
): boolean {
  if (splits.length !== memberIds.length) return false;
  const expected = new Map(
    equalSplits(amountCents, memberIds).map((s) => [s.userId, s.amountCents]),
  );
  return splits.every((s) => expected.get(s.userId) === s.amountCents);
}

export type SplitPrefill = {
  mode: SplitMode;
  exactAmounts: Record<string, number>;
  memberIds: string[];
};

/**
 * Reconstruct the modal state for an edited expense: equal-ish splits reopen
 * in "equally" mode over their original participants; anything custom
 * reopens as exact amounts in the entered currency. Zero-share members are
 * dropped from the selection (their share was zero; re-adding them would
 * change the split on save).
 */
export function prefillFromSplits(input: {
  nativeAmountCents: number;
  usdSplits: readonly SplitCents[];
}): SplitPrefill {
  const native = reverseConvertSplits(input);
  const participants = native.filter((s) => s.amountCents > 0);
  const participantIds = participants.map((s) => s.userId);

  if (
    participantIds.length > 0 &&
    isEqualSplits(participants, participantIds, input.nativeAmountCents)
  ) {
    return { mode: "equal", exactAmounts: {}, memberIds: participantIds };
  }

  return {
    mode: "exact",
    exactAmounts: Object.fromEntries(
      native.map((s) => [s.userId, s.amountCents]),
    ),
    memberIds:
      participantIds.length > 0 ? participantIds : native.map((s) => s.userId),
  };
}