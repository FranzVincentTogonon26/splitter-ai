/**
 * Pure net-balance math — no I/O, so it can be fuzz-tested directly with
 * `node --test` (see lib/balances.test.ts).
 *
 * Sign convention: positive = member is owed money (creditor),
 * negative = member owes money (debtor), 0 = settled.
 */

/** Minimal expense shape needed to compute balances (Prisma rows satisfy it). */
export type LedgerExpense = {
  paidById: string;
  amountCents: number;
  splits: { userId: string; amountCents: number }[];
};

/** Minimal settlement shape needed to compute balances. */
export type LedgerSettlement = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

/**
 * Net balance per member from a group ledger, in integer cents.
 *
 * Every listed member starts at 0. Expenses credit the payer and debit each
 * sharer; settlements credit the sender and debit the receiver. Expense
 * splits are server-validated to sum exactly to the expense total, so the
 * resulting balances always sum to zero across the group.
 */
export function balancesFromLedger(
  memberIds: readonly string[],
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const id of memberIds) balances.set(id, 0);

  for (const e of expenses) {
    balances.set(e.paidById, (balances.get(e.paidById) ?? 0) + e.amountCents);
    for (const s of e.splits) {
      balances.set(s.userId, (balances.get(s.userId) ?? 0) - s.amountCents);
    }
  }
  for (const st of settlements) {
    balances.set(
      st.fromUserId,
      (balances.get(st.fromUserId) ?? 0) + st.amountCents,
    );
    balances.set(
      st.toUserId,
      (balances.get(st.toUserId) ?? 0) - st.amountCents,
    );
  }
  return balances;
}
