import { notFound } from "next/navigation";
import type { Group } from "@prisma/client";

import { db } from "@/lib/db";
import { balancesFromLedger } from "./balances";
import { displayCents, type DisplayCurrency } from "./fx";
import { formatDate, formatMoneyIn } from "./format";
import { simplifyDebts } from "./simplify-debts";
import type {
  DashboardGroupCard,
  DashboardView,
  ExpenseRow,
  GroupView,
  MemberRow,
} from "./types";

/**
 * Net balance per member, derived at read time (never stored):
 * (paid) - (share of every expense) +/- settlements.
 */
export async function netBalances(groupId: string): Promise<Map<string, number>> {
  const [expenses, settlements, members] = await Promise.all([
    db.expense.findMany({
      where: { groupId },
      include: { splits: true },
    }),
    db.settlement.findMany({ where: { groupId } }),
    db.groupMember.findMany({ where: { groupId } }),
  ]);

  return balancesFromLedger(
    members.map((m) => m.userId),
    expenses,
    settlements,
  );
}

async function groupCard(
  group: Group,
  userId: string,
  display: DisplayCurrency,
): Promise<DashboardGroupCard> {
  const [memberRows, total, balances] = await Promise.all([
    db.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: true },
    }),
    db.expense.aggregate({
      where: { groupId: group.id },
      _sum: { amountCents: true },
    }),
    netBalances(group.id),
  ]);

  // The ledger is USD; everything leaving this function is display currency.
  const dc = (usdCents: number) => displayCents(usdCents, display.perUsd);

  return {
    group,
    yourBalanceCents: dc(balances.get(userId) ?? 0),
    totalCents: dc(total._sum.amountCents ?? 0),
    members: memberRows.map((m) => m.user),
  };
}

export async function getDashboard(
  userId: string,
  firstName: string,
  display: DisplayCurrency,
): Promise<DashboardView> {
  const memberships = await db.groupMember.findMany({
    where: { userId },
    include: { group: true },
  });

  const cards = await Promise.all(
    memberships.map((m) => groupCard(m.group, userId, display)),
  );

  return {
    firstName,
    displayCode: display.code,
    fellBackToUsd: display.fellBackToUsd,
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

export async function getGroupView(
  groupId: string,
  userId: string,
  display: DisplayCurrency,
): Promise<GroupView> {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) notFound();

  const [memberRows, expenses, balances] = await Promise.all([
    db.groupMember.findMany({
      where: { groupId },
      include: { user: true },
    }),
    db.expense.findMany({
      where: { groupId },
      include: { splits: true },
      orderBy: { createdAt: "desc" },
    }),
    netBalances(groupId),
  ]);

  if (!memberRows.some((m) => m.userId === userId)) notFound();

  // Display-currency helpers: convert USD ledger cents, then format in the
  // display code (one conversion point for every amount on the group page).
  const dc = (usdCents: number) => displayCents(usdCents, display.perUsd);
  const fm = (usdCents: number) => formatMoneyIn(display.code, dc(usdCents));

  const nameByUser = new Map<string, string>();
  for (const m of memberRows) nameByUser.set(m.userId, m.user.name);
  const nameOf = (id: string) =>
    id === userId ? "You" : (nameByUser.get(id) ?? "Unknown");

  const expensesView: ExpenseRow[] = expenses.map((e) => {
    // Preserve the original entry (e.g. "€25.00") when it differs from the
    // display currency, so rows show original + display equivalent.
    const nativeLabel =
      e.currency === display.code
        ? null
        : formatMoneyIn(e.currency, e.nativeAmountCents);
    const yourShareCents =
      e.splits.find((s) => s.userId === userId)?.amountCents ?? 0;

    return {
      id: e.id,
      description: e.description,
      payerName: nameOf(e.paidById),
      paidById: e.paidById,
      amountCents: e.amountCents,
      paidLabel: fm(e.amountCents),
      nativeLabel,
      dateLabel: formatDate(e.createdAt),
      yourShareCents,
      yourShareLabel: fm(yourShareCents),
      isRecent: Date.now() - e.createdAt.getTime() < 60_000,
      // Edit-prefill data (phase 12)
      currency: e.currency,
      nativeAmountCents: e.nativeAmountCents,
      splits: e.splits.map((s) => ({
        userId: s.userId,
        amountCents: s.amountCents,
      })),
    };
  });

  const members: MemberRow[] = memberRows.map((m) => ({
    user: m.user,
    role: m.role === "admin" ? "admin" : "member",
  }));

  return {
    group,
    displayCode: display.code,
    fellBackToUsd: display.fellBackToUsd,
    yourBalanceCents: dc(balances.get(userId) ?? 0),
    totalCents: expenses.reduce((sum, e) => sum + dc(e.amountCents), 0),
    members,
    expenses: expensesView,
    debts: simplifyDebts(balances).map((d) => ({
      // amountCents stays in USD ledger cents — settleUp validates against
      // the USD ledger; displayLabel is what the UI renders.
      ...d,
      displayLabel: fm(d.amountCents),
    })),
  };
}