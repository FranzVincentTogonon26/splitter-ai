const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currencyCode: string): Intl.NumberFormat {
  let fmt = formatters.get(currencyCode);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    });
    formatters.set(currencyCode, fmt);
  }
  return fmt;
}

/** Format integer cents in USD — the ledger's native formatting. */
export function formatMoney(cents: number): string {
  return formatterFor("USD").format(cents / 100);
}

/** Format integer cents as an amount of `currencyCode`. */
export function formatMoneyIn(currencyCode: string, cents: number): string {
  return formatterFor(currencyCode).format(cents / 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
