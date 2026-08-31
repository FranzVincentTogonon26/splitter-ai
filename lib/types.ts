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
  displayCode: string;
  fellBackToUsd: boolean;
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
  /** What the payer paid, in the active display currency. */
  paidLabel: string;
  /** The original entry (e.g. "€25.00") when it differs from the display
   *  currency; null when the expense was entered in the display currency. */
  nativeLabel: string | null;
  dateLabel: string;
  yourShareCents: number;
  /** The viewer's split, in the active display currency. */
  yourShareLabel: string;
  isRecent: boolean;
};

export type DebtRow = {
  fromUserId: string;
  toUserId: string;
  /** USD ledger cents — the settleUp action contract. */
  amountCents: number;
  /** The debt, formatted in the active display currency. */
  displayLabel: string;
};

export type GroupView = {
  group: Group;
  displayCode: string;
  fellBackToUsd: boolean;
  yourBalanceCents: number;
  totalCents: number;
  members: MemberRow[];
  expenses: ExpenseRow[];
  debts: DebtRow[];
};
