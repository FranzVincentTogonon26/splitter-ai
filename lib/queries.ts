import { notFound } from "next/navigation";
import type { Group } from "@prisma/client";

import { db } from "@/lib/db";
import { balancesFromLedger } from "./balances";
import { formatDate, formatMoney } from "./format";
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

  return {
    group,
    yourBalanceCents: balances.get(userId) ?? 0,
    totalCents: total._sum.amountCents ?? 0,
    members: memberRows.map((m) => m.user),
  };
}

export async function getDashboard(
  userId: string,
  firstName: string,
): Promise<DashboardView> {
  const memberships = await db.groupMember.findMany({
    where: { userId },
    include: { group: true },
  });

  const cards = await Promise.all(
    memberships.map((m) => groupCard(m.group, userId)),
  );

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

export async function getGroupView(
  groupId: string,
  userId: string,
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

  const nameByUser = new Map<string, string>();
  for (const m of memberRows) nameByUser.set(m.userId, m.user.name);
  const nameOf = (id: string) =>
    id === userId ? "You" : (nameByUser.get(id) ?? "Unknown");

  const expensesView: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    payerName: nameOf(e.paidById),
    paidById: e.paidById,
    amountCents: e.amountCents,
    paidLabel: formatMoney(e.amountCents),
    dateLabel: formatDate(e.createdAt),
    yourShareCents: e.splits.find((s) => s.userId === userId)?.amountCents ?? 0,
    isRecent: Date.now() - e.createdAt.getTime() < 60_000,
  }));

  const members: MemberRow[] = memberRows.map((m) => ({
    user: m.user,
    role: m.role === "admin" ? "admin" : "member",
  }));

  return {
    group,
    yourBalanceCents: balances.get(userId) ?? 0,
    totalCents: expenses.reduce((sum, e) => sum + e.amountCents, 0),
    members,
    expenses: expensesView,
    debts: simplifyDebts(balances),
  };
}