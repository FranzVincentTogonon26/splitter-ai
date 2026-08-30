import type { DebtRow } from "./types";

/**
 * Greedy debt minimization: repeatedly match the largest debtor with the
 * largest creditor and transfer as much as possible. Every transfer zeroes
 * out at least one side, so any group settles in at most (nonzero members − 1)
 * payments. Pure function — fuzz-tested with `node --test`
 * (see lib/simplify-debts.test.ts).
 *
 * Deterministic: participants are matched by amount descending, ties broken
 * by insertion order (i.e. member order in the balances map).
 */
export function simplifyDebts(balances: Map<string, number>): DebtRow[] {
  const debtors = [...balances.entries()]
    .filter(([, cents]) => cents < 0)
    .map(([id, cents]) => ({ id, cents: -cents }))
    .sort((a, b) => b.cents - a.cents);
  const creditors = [...balances.entries()]
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ id, cents }))
    .sort((a, b) => b.cents - a.cents);

  const debts: DebtRow[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].cents, creditors[ci].cents);
    debts.push({
      fromUserId: debtors[di].id,
      toUserId: creditors[ci].id,
      amountCents: amount,
    });
    debtors[di].cents -= amount;
    creditors[ci].cents -= amount;
    if (debtors[di].cents === 0) di++;
    if (creditors[ci].cents === 0) ci++;
  }
  return debts;
}
