export type User = {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
};

export type Group = {
  id: string;
  name: string;
};

export type GroupMemberRole = "admin" | "member";

export type GroupMember = {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
};

export type Expense = {
  id: string;
  groupId: string;
  paidById: string;
  amountCents: number;
  description: string;
  createdAt: Date;
};

export type ExpenseSplit = {
  expenseId: string;
  userId: string;
  amountCents: number;
};

export type Settlement = {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  createdAt: Date;
};

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
