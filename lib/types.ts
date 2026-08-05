// Shared view-model types. Shaped to match the Prisma models that arrive in
// Phase 3, so swapping mock data for real queries is a drop-in change.

export type Member = {
  id: string; // Clerk userId
  name: string;
  email: string;
  imageUrl?: string | null;
};

export type ExpenseSplit = {
  userId: string;
  amountCents: number;
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  paidById: string;
  createdAt: Date;
  splits: ExpenseSplit[];
};

export type GroupSummary = {
  id: string;
  name: string;
  members: Member[];
  totalCents: number;
  /** Positive: the group owes you. Negative: you owe the group. */
  yourBalanceCents: number;
};

export type GroupDetail = GroupSummary & {
  expenses: Expense[];
  simplifiedDebts: SimplifiedDebt[];
};

export type SimplifiedDebt = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};
