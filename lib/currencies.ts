/**
 * The 20 currencies splitter-ai supports for expense entry and display —
 * the ECB reference set frankfurter.dev serves. One shared list so the
 * expense modal, the display-currency switcher, and server-side validation
 * can never drift apart.
 */

export type CurrencyInfo = {
  /** ISO 4217 code (frankfurter.dev key). */
  code: string;
  /** Human name for the switcher dropdown. */
  name: string;
  /** Symbol prefix used in the entry UI (e.g. "€"). */
  symbol: string;
  /**
   * True for zero-decimal currencies (JPY, KRW): their smallest unit IS the
   * unit, so "cents" in those currencies are whole coins and the UI must not
   * show decimals.
   */
  zeroDecimal: boolean;
};

const USD: CurrencyInfo = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  zeroDecimal: false,
};

export const CURRENCIES: readonly CurrencyInfo[] = [
  USD,
  { code: "EUR", name: "Euro", symbol: "€", zeroDecimal: false },
  { code: "GBP", name: "British Pound", symbol: "£", zeroDecimal: false },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", zeroDecimal: true },
  { code: "INR", name: "Indian Rupee", symbol: "₹", zeroDecimal: false },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥", zeroDecimal: false },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", zeroDecimal: false },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", zeroDecimal: false },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", zeroDecimal: false },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", zeroDecimal: false },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", zeroDecimal: false },
  { code: "KRW", name: "South Korean Won", symbol: "₩", zeroDecimal: true },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", zeroDecimal: false },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", zeroDecimal: false },
  { code: "ZAR", name: "South African Rand", symbol: "R", zeroDecimal: false },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", zeroDecimal: false },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", zeroDecimal: false },
  { code: "DKK", name: "Danish Krone", symbol: "kr", zeroDecimal: false },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", zeroDecimal: false },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", zeroDecimal: false },
];

const SUPPORTED_CURRENCY_SET = new Set(CURRENCIES.map((c) => c.code));

/**
 * The same 20 codes as a const tuple — the zod enum source for the AI
 * structured output (the model may only answer with one of these).
 */
export const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "INR",
  "CNY",
  "CAD",
  "AUD",
  "CHF",
  "SGD",
  "HKD",
  "KRW",
  "BRL",
  "MXN",
  "ZAR",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "CZK",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** True when `code` is one of the 20 supported ECB currency codes. */
export function isSupportedCurrency(
  code: string | undefined | null,
): code is string {
  return typeof code === "string" && SUPPORTED_CURRENCY_SET.has(code);
}

/** The currency metadata for `code`; falls back to USD for unknown codes. */
export function currencyOf(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? USD;
}
