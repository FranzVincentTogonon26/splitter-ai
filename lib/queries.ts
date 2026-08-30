import { notFound } from "next/navigation";

import { formatDate, formatMoney, formatMoneyIn } from "./format";
import {
  getExpensesByGroup,
  getGroupById,
  getGroupIdsForUser,
  getGroupMemberIds,
  getMemberRole,
  getSplitsByGroup,
  getSettlementsByGroup,
  getUserById,
} from "./mock-db";
import type {
  DashboardView,
  DebtRow,
  ExpenseRow,
  GroupView,
  User,
  Expense,
  ExpenseSplit,
  Settlement,
} from "./types";

function ledger(groupId: string): {
  expenses: Expense[];
  splits: ExpenseSplit[];
  settlements: Settlement[];
} {
  return {
    expenses: getExpensesByGroup(groupId),
    splits: getSplitsByGroup(groupId),
    settlements: getSettlementsByGroup(groupId),
  };
}

export function netBalances(groupId: string): Map<string, number> {
  const balances = new Map<string, number>();
  for (const id of getGroupMemberIds(groupId)) balances.set(id, 0);

  const { expenses, splits, settlements } = ledger(groupId);

  for (const e of expenses) {
    balances.set(e.paidById, (balances.get(e.paidById) ?? 0) + e.amountCents);
  }
  for (const s of splits) {
    balances.set(s.userId, (balances.get(s.userId) ?? 0) - s.amountCents);
  }
  for (const st of settlements) {
    balances.set(st.fromUserId, (balances.get(st.fromUserId) ?? 0) + st.amountCents);
    balances.set(st.toUserId, (balances.get(st.toUserId) ?? 0) - st.amountCents);
  }
  return balances;
}

function simplifyDebts(balances: Map<string, number>): DebtRow[] {
  const debtors = [...balances.entries()]
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, cents: -v }));
  const creditors = [...balances.entries()]
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, cents: v }));

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

function groupCard(groupId: string, userId: string) {
  const group = getGroupById(groupId)!;
  const memberUsers = getGroupMemberIds(groupId)
    .map(getUserById)
    .filter((u): u is User => Boolean(u));
  return {
    group,
    yourBalanceCents: netBalances(groupId).get(userId) ?? 0,
    totalCents: getExpensesByGroup(groupId).reduce(
      (sum, e) => sum + e.amountCents,
      0,
    ),
    members: memberUsers,
  };
}

export function getDashboard(
  userId: string,
  firstName: string,
): DashboardView {
  const cards = getGroupIdsForUser(userId)
    .filter((id) => getGroupById(id))
    .map((id) => groupCard(id, userId));

  return {
    firstName,
    totalOwedToYouCents: cards.reduce(
      (sum, c) => sum + Math.max(0, c.yourBalanceCents),
      0,
    ),
    totalYouOweCents: cards.reduce(
      (sum, c) => sum + Math.max(0, -c.yourBalanceCents),
      0,
    ),
    groups: cards,
  };
}

export function getGroupView(groupId: string, userId: string): GroupView {
  const group = getGroupById(groupId);
  if (!group || !getGroupMemberIds(groupId).includes(userId)) notFound();

  const memberIds = getGroupMemberIds(groupId);
  const allSplits = getSplitsByGroup(groupId);
  const nameFor = (id: string) => {
    if (id === userId) return "You";
    return getUserById(id)?.name ?? "Unknown";
  };

  const expenses: ExpenseRow[] = getExpensesByGroup(groupId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((e) => ({
      id: e.id,
      description: e.description,
      payerName: nameFor(e.paidById),
      paidById: e.paidById,
      amountCents: e.amountCents,
      paidLabel:
        e.originalCurrency === "USD"
          ? formatMoney(e.amountCents)
          : `${formatMoneyIn(e.originalCurrency, e.originalAmountCents)} (≈ ${formatMoney(e.amountCents)})`,
      dateLabel: formatDate(e.createdAt),
      yourShareCents:
        allSplits.find((s) => s.expenseId === e.id && s.userId === userId)
          ?.amountCents ?? 0,
      isRecent: Date.now() - e.createdAt.getTime() < 60_000,
    }));

  const members = memberIds
    .map(getUserById)
    .filter((u): u is User => Boolean(u))
    .map((user) => ({
      user,
      role: getMemberRole(groupId, user.id) ?? ("member" as const),
    }));

  const balances = netBalances(groupId);

  return {
    group,
    yourBalanceCents: balances.get(userId) ?? 0,
    totalCents: getExpensesByGroup(groupId).reduce(
      (sum, e) => sum + e.amountCents,
      0,
    ),
    members,
    expenses,
    debts: simplifyDebts(balances),
  };
}
