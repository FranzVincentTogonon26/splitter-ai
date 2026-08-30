import type { Group, User } from "@prisma/client";

export type GroupMemberRole = "admin" | "member";

export type DashboardGroupCard = {
  group: Group;
  yourBalanceCents: number;
  totalCents: number;
  members: User[];
};

export type DashboardView = {
  firstName: string;
  totalOwedToYouCents: number;
  totalYouOweCents: number;
  groups: DashboardGroupCard[];
};

export type MemberRow = {
  user: User;
  role: GroupMemberRole;
};

export type ExpenseRow = {
  id: string;
  description: string;
  payerName: string;
  paidById: string;
  amountCents: number;
  paidLabel: string;
  dateLabel: string;
  yourShareCents: number;
  isRecent: boolean;
};

export type DebtRow = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

export type GroupView = {
  group: Group;
  yourBalanceCents: number;
  totalCents: number;
  members: MemberRow[];
  expenses: ExpenseRow[];
  debts: DebtRow[];
};
