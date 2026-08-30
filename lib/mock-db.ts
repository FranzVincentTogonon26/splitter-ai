import { currentUser } from "@clerk/nextjs/server";

import type {
  Expense,
  ExpenseSplit,
  Group,
  GroupMember,
  Settlement,
  User,
} from "./types";

// Demo avatars: a stable random photo per user id, so the UI doesn't rely on
// Clerk images during the mock phase. The colored-initial fallback still shows
// if the network image fails. Removed in phase 03 when Prisma + the Clerk
// webhook sync real images.
export function demoAvatarUrl(id: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(id)}`;
}

const ANKITA: User = {
  id: "user_mock_ankita",
  email: "itskulkarniankita@example.com",
  name: "Ankita Kulkarni",
  imageUrl: demoAvatarUrl("user_mock_ankita"),
};

const users: User[] = [ANKITA];

const groups: Group[] = [
  { id: "grp_viareggio", name: "viareggio" },
  { id: "grp_amalfi", name: "amalfi" },
];

const members: GroupMember[] = [
  { groupId: "grp_viareggio", userId: ANKITA.id, role: "member" },
  { groupId: "grp_amalfi", userId: ANKITA.id, role: "member" },
];

const expenses: Expense[] = [];
const splits: ExpenseSplit[] = [];
const settlements: Settlement[] = [];

let seededForUserId: string | null = null;

function seedDemoData(viewerId: string) {
  members.push(
    { groupId: "grp_viareggio", userId: viewerId, role: "admin" },
    { groupId: "grp_amalfi", userId: viewerId, role: "admin" },
  );

  const lobster: Expense = {
    id: "exp_lobster",
    groupId: "grp_viareggio",
    paidById: viewerId,
    amountCents: 10248,
    originalCurrency: "EUR",
    originalAmountCents: 8900,
    description: "Lobster dinner",
    createdAt: new Date("2026-08-05T18:00:00"),
  };
  const beachClub: Expense = {
    id: "exp_beach_club",
    groupId: "grp_viareggio",
    paidById: viewerId,
    amountCents: 5758,
    originalCurrency: "EUR",
    originalAmountCents: 5000,
    description: "Beach club",
    createdAt: new Date("2026-08-05T15:00:00"),
  };
  const dinner: Expense = {
    id: "exp_dinner",
    groupId: "grp_viareggio",
    paidById: ANKITA.id,
    amountCents: 7002,
    originalCurrency: "USD",
    originalAmountCents: 7002,
    description: "dinner",
    createdAt: new Date("2026-08-05T12:00:00"),
  };
  const boatDay: Expense = {
    id: "exp_boat_day",
    groupId: "grp_amalfi",
    paidById: viewerId,
    amountCents: 6800,
    originalCurrency: "USD",
    originalAmountCents: 6800,
    description: "Boat day",
    createdAt: new Date("2026-07-20T10:00:00"),
  };

  expenses.push(lobster, beachClub, dinner, boatDay);

  for (const e of [lobster, beachClub]) {
    splits.push(
      { expenseId: e.id, userId: viewerId, amountCents: Math.round(e.amountCents / 2) },
      { expenseId: e.id, userId: ANKITA.id, amountCents: e.amountCents - Math.round(e.amountCents / 2) },
    );
  }
  const dinnerShare = Math.round(dinner.amountCents / 2);
  splits.push(
    { expenseId: dinner.id, userId: ANKITA.id, amountCents: dinnerShare },
    { expenseId: dinner.id, userId: viewerId, amountCents: dinner.amountCents - dinnerShare },
  );
  const boatShare = Math.round(boatDay.amountCents / 2);
  splits.push(
    { expenseId: boatDay.id, userId: viewerId, amountCents: boatShare },
    { expenseId: boatDay.id, userId: ANKITA.id, amountCents: boatDay.amountCents - boatShare },
  );

  settlements.push({
    id: "stl_amalfi_settle",
    groupId: "grp_amalfi",
    fromUserId: ANKITA.id,
    toUserId: viewerId,
    amountCents: boatDay.amountCents - boatShare,
    createdAt: new Date("2026-07-21T09:00:00"),
  });

  seededForUserId = viewerId;
}

export async function ensureCurrentUser(): Promise<User> {
  const cu = await currentUser();
  if (!cu) throw new Error("Unauthenticated");

  let user = users.find((u) => u.id === cu.id);
  if (!user) {
    user = {
      id: cu.id,
      email: cu.primaryEmailAddress?.emailAddress ?? "unknown@example.com",
      name: cu.fullName ?? cu.firstName ?? "You",
      imageUrl: cu.imageUrl ?? demoAvatarUrl(cu.id),
    };
    users.push(user);
  }
  if (user.imageUrl === null) user.imageUrl = demoAvatarUrl(user.id);
  if (seededForUserId !== user.id) seedDemoData(user.id);
  return user;
}

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function findUserByEmail(email: string): User | undefined {
  const needle = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === needle);
}

export function getGroupById(id: string): Group | undefined {
  return groups.find((g) => g.id === id);
}

export function getExpensesByGroup(groupId: string): Expense[] {
  return expenses.filter((e) => e.groupId === groupId);
}

export function getSplitsByGroup(groupId: string): ExpenseSplit[] {
  const ids = new Set(getExpensesByGroup(groupId).map((e) => e.id));
  return splits.filter((s) => ids.has(s.expenseId));
}

export function getSettlementsByGroup(groupId: string): Settlement[] {
  return settlements.filter((s) => s.groupId === groupId);
}

export function getGroupMemberIds(groupId: string): string[] {
  return members.filter((m) => m.groupId === groupId).map((m) => m.userId);
}

export function getGroupIdsForUser(userId: string): string[] {
  return members.filter((m) => m.userId === userId).map((m) => m.groupId);
}

export function getMemberRole(
  groupId: string,
  userId: string,
): "admin" | "member" | undefined {
  return members.find((m) => m.groupId === groupId && m.userId === userId)?.role;
}

export function insertGroup(name: string, creatorId: string): Group {
  const group: Group = { id: `grp_${crypto.randomUUID()}`, name };
  groups.push(group);
  members.push({ groupId: group.id, userId: creatorId, role: "admin" });
  return group;
}

export function insertGroupMember(groupId: string, userId: string): void {
  if (members.some((m) => m.groupId === groupId && m.userId === userId)) return;
  members.push({ groupId, userId, role: "member" });
}

export function insertEqualExpense(input: {
  groupId: string;
  paidById: string;
  description: string;
  amountCents: number;
  memberIds: string[];
}): Expense {
  const expense: Expense = {
    id: `exp_${crypto.randomUUID()}`,
    groupId: input.groupId,
    paidById: input.paidById,
    amountCents: input.amountCents,
    originalCurrency: "USD",
    originalAmountCents: input.amountCents,
    description: input.description,
    createdAt: new Date(),
  };
  expenses.push(expense);

  const n = input.memberIds.length;
  const base = Math.floor(input.amountCents / n);
  let remainder = input.amountCents - base * n;
  for (const userId of input.memberIds) {
    const share = remainder > 0 ? base + 1 : base;
    remainder -= remainder > 0 ? 1 : 0;
    splits.push({ expenseId: expense.id, userId, amountCents: share });
  }
  return expense;
}

export function insertSettlement(input: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}): void {
  settlements.push({
    id: `stl_${crypto.randomUUID()}`,
    groupId: input.groupId,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    amountCents: input.amountCents,
    createdAt: new Date(),
  });
}
