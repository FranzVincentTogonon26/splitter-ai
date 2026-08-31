/**
 * FX conversion — the phase-07 money-math core.
 *
 * Convention: `perUsd` = units of a currency per 1 USD (frankfurter.dev's
 * `?base=USD` shape). Native cents → USD cents divides by the rate; USD →
 * display multiplies. "Cents" is uniformly hundredths of the major unit
 * (JPY/KRW store 100 × whole coins — see lib/currencies.ts).
 *
 * This module is deliberately dependency-free so `npm test` can import it
 * with bare Node (type stripping) like splits.ts and balances.ts. The only
 * impure piece is getRates, which is never exercised by unit tests.
 */

/** Units per 1 USD keyed by ISO code ("USD" itself is not a key). */
export type FxRates = Readonly<Record<string, number>>;

export const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD";

/**
 * Latest ECB rates with USD as the base, cached one hour via Next's fetch
 * revalidation. Returns null on any failure — callers degrade to USD.
 */
export async function getRates(): Promise<FxRates | null> {
  try {
    const res = await fetch(FRANKFURTER_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const rates =
      typeof body === "object" && body !== null
        ? (body as { rates?: unknown }).rates
        : undefined;
    if (typeof rates !== "object" || rates === null) return null;
    return rates as FxRates;
  } catch {
    return null;
  }
}

/**
 * The perUsd rate for `code`: USD is always 1; anything else must be present
 * in `rates` (null when rates are unavailable or the code is unknown).
 */
export function perUsdFor(rates: FxRates | null, code: string): number | null {
  if (code === "USD") return 1;
  if (rates === null) return null;
  const rate = rates[code];
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0
    ? rate
    : null;
}

/** A member's share of an expense (structural type; matches lib/splits.ts). */
export type FxSplit = { userId: string; amountCents: number };

export type ToUsdResult =
  | { ok: true; amountCents: number; splits: FxSplit[] }
  | { ok: false; error: string };

/**
 * Convert a validated native-currency expense (total + exact-sum splits,
 * both in native cents) to USD once, at save time.
 *
 * The total converts with plain rounding, then each split converts
 * proportionally via largest-remainder apportionment — floors every share
 * and hands leftover cents to the largest fractional remainders (member
 * order breaks ties), mirroring percentageSplits. The USD splits are
 * therefore guaranteed to sum EXACTLY to the USD total, preserving the
 * group-balances-sum-to-zero invariant.
 */
export function convertToUsd(input: {
  nativeAmountCents: number;
  splits: readonly FxSplit[];
  perUsd: number | null;
}): ToUsdResult {
  const { nativeAmountCents, splits, perUsd } = input;

  if (perUsd === null || !Number.isFinite(perUsd) || perUsd <= 0) {
    return { ok: false, error: "Exchange rates unavailable — try again in a moment" };
  }

  const amountCents = Math.round(nativeAmountCents / perUsd);
  if (amountCents <= 0) {
    return { ok: false, error: "Amount is too small to convert" };
  }

  const exactShares = splits.map((s) => s.amountCents / perUsd);
  const shares = exactShares.map((v) => Math.floor(v));
  let leftover = amountCents - shares.reduce((a, b) => a + b, 0);

  // Fractional remainder, largest first; stable sort keeps member order on
  // ties (identical tie-breaking to percentageSplits in lib/splits.ts).
  const byRemainder = splits
    .map((_, i) => i)
    .sort((a, b) => exactShares[b] % 1 - (exactShares[a] % 1));
  for (let k = 0; leftover > 0; k++, leftover--) {
    shares[byRemainder[k % byRemainder.length]] += 1;
  }

  const usdSplits = splits.map((s, i) => ({ userId: s.userId, amountCents: shares[i] }));

  // Defense in depth (same policy as computeSplits): never write splits that
  // do not reconcile to the converted total.
  const sum = usdSplits.reduce((acc, s) => acc + s.amountCents, 0);
  if (sum !== amountCents) return { ok: false, error: "Conversion does not add up" };

  return { ok: true, amountCents, splits: usdSplits };
}

/** USD cents → display-currency cents (plain rounding per amount). */
export function displayCents(usdCents: number, perUsd: number): number {
  return Math.round(usdCents * perUsd);
}

export type DisplayCurrency = {
  /** Validated display code ("USD" or one frankfurter serves). */
  code: string;
  /** Multiply USD cents by this, then round, for display amounts. */
  perUsd: number;
  /** True when a non-USD display was requested but rates were unavailable. */
  fellBackToUsd: boolean;
};

/**
 * Resolve the `?currency=` display choice from a URL param. Unknown or
 * missing means USD; a known code with rates down degrades to USD so pages
 * always render (flagged, so the UI can say why).
 */
export async function resolveDisplay(
  requested: string | undefined,
): Promise<DisplayCurrency> {
  const code = (requested ?? "USD").trim().toUpperCase();
  if (code === "USD") return { code: "USD", perUsd: 1, fellBackToUsd: false };

  const rates = await getRates();
  const perUsd = perUsdFor(rates, code);
  if (perUsd === null) {
    return { code: "USD", perUsd: 1, fellBackToUsd: true };
  }
  return { code, perUsd, fellBackToUsd: false };
}
