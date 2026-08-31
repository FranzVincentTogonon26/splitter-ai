"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { isSupportedCurrency } from "@/lib/currencies";
import { getRates, perUsdFor, convertToUsd } from "@/lib/fx";
import { netBalances } from "@/lib/queries";
import { computeSplits, splitsFromFormData } from "@/lib/splits";

export type AddExpenseState = { ok?: boolean; error?: string };

type ValidatedExpense =
  | {
      ok: true;
      paidById: string;
      description: string;
      currency: string;
      nativeAmountCents: number;
      usdAmountCents: number;
      usdSplits: { userId: string; amountCents: number }[];
    }
  | { ok: false; error: string };

/**
 * The ONE validation path for expense entry (nextjs-review #31): both
 * addExpense and updateExpense funnel through this — description, currency
 * and amount checks, computeSplits validation in the entered currency, and
 * the one-shot conversion to USD at today's rate. An edit is a full
 * re-entry, never a partial-field update.
 */
async function validateExpenseInput(
  formData: FormData,
  memberIds: string[],
): Promise<ValidatedExpense> {
  const description = String(formData.get("description") ?? "").trim();
  const currencyField = String(formData.get("currency") ?? "USD");
  const currency = isSupportedCurrency(currencyField) ? currencyField : "USD";
  const nativeAmountCents = Math.round(Number(formData.get("amount")) * 100);
  const paidById = String(formData.get("paidBy") ?? "");
  const { mode, memberIds: splitIds, percentages, exactCents } =
    splitsFromFormData(formData);

  if (!description) return { ok: false, error: "Enter a description" };
  if (!memberIds.includes(paidById)) return { ok: false, error: "Choose who paid" };

  // Validate + split in the currency the user entered — the split math is
  // currency-agnostic integer-cent math (lib/splits.ts).
  const native = computeSplits({
    amountCents: nativeAmountCents,
    memberIds: splitIds,
    allowedIds: memberIds,
    mode,
    percentages,
    exactCents,
  });
  if (!native.ok) return { ok: false, error: native.error };

  // Convert once to USD at today's rate (USD itself never hits the network).
  const rates = currency === "USD" ? null : await getRates();
  const usd = convertToUsd({
    nativeAmountCents,
    splits: native.splits,
    perUsd: perUsdFor(rates, currency),
  });
  if (!usd.ok) return { ok: false, error: usd.error };

  return {
    ok: true,
    paidById,
    description,
    currency,
    nativeAmountCents,
    usdAmountCents: usd.amountCents,
    usdSplits: usd.splits,
  };
}

export async function addExpense(
  groupId: string,
  _prev: AddExpenseState,
  formData: FormData,
): Promise<AddExpenseState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const memberRows = await db.groupMember.findMany({ where: { groupId } });
  const memberIds = memberRows.map((m) => m.userId);
  if (memberIds.length === 0 || !memberIds.includes(userId)) {
    return { error: "Group not found" };
  }

  const input = await validateExpenseInput(formData, memberIds);
  if (!input.ok) return { error: input.error };

  await db.expense.create({
    data: {
      groupId,
      paidById: input.paidById,
      description: input.description,
      // amountCents + splits are ALWAYS USD (the ledger currency); the
      // original entry is preserved in currency + nativeAmountCents.
      amountCents: input.usdAmountCents,
      currency: input.currency,
      nativeAmountCents: input.nativeAmountCents,
      splits: { create: input.usdSplits },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export type UpdateExpenseState = AddExpenseState;

export async function updateExpense(
  groupId: string,
  expenseId: string,
  _prev: UpdateExpenseState,
  formData: FormData,
): Promise<UpdateExpenseState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const memberRows = await db.groupMember.findMany({ where: { groupId } });
  const memberIds = memberRows.map((m) => m.userId);
  if (memberIds.length === 0 || !memberIds.includes(userId)) {
    return { error: "Group not found" };
  }

  const existing = await db.expense.findUnique({ where: { id: expenseId } });
  if (!existing || existing.groupId !== groupId) {
    return { error: "Expense not found" };
  }

  const input = await validateExpenseInput(formData, memberIds);
  if (!input.ok) return { error: input.error };

  // Nested deleteMany + create: the total and its splits are rewritten
  // atomically, so they can never drift (nextjs-review #31).
  await db.expense.update({
    where: { id: expenseId },
    data: {
      paidById: input.paidById,
      description: input.description,
      amountCents: input.usdAmountCents,
      currency: input.currency,
      nativeAmountCents: input.nativeAmountCents,
      splits: { deleteMany: {}, create: input.usdSplits },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export type SettleUpState = { error?: string };

export async function settleUp(
  groupId: string,
  fromUserId: string,
  toUserId: string,
  amountCents: number,
): Promise<SettleUpState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const memberRows = await db.groupMember.findMany({ where: { groupId } });
  const memberIds = memberRows.map((m) => m.userId);
  if (memberIds.length === 0 || !memberIds.includes(userId)) {
    return { error: "Group not found" };
  }
  if (!memberIds.includes(fromUserId) || !memberIds.includes(toUserId)) {
    return { error: "Group not found" };
  }

  const owed = -((await netBalances(groupId)).get(fromUserId) ?? 0);
  if (amountCents <= 0 || amountCents > owed) {
    return { error: "Nothing to settle" };
  }

  await db.settlement.create({
    data: { groupId, fromUserId, toUserId, amountCents },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export type DeleteExpenseState = { error?: string };

/**
 * Delete one expense and its splits, atomically. Group-scoped: the caller
 * must be a member of the group the expense belongs to, and the expense id
 * is re-checked against the groupId so cross-group deletes fail cleanly.
 * Settlements are never touched — a recorded payment is its own fact
 * (architecture invariant).
 */
export async function deleteExpense(
  groupId: string,
  expenseId: string,
): Promise<DeleteExpenseState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const membership = await db.groupMember.findFirst({
    where: { groupId, userId },
  });
  if (!membership) return { error: "Group not found" };

  const expense = await db.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.groupId !== groupId) {
    return { error: "Expense not found" };
  }

  await db.$transaction([
    db.expenseSplit.deleteMany({ where: { expenseId } }),
    db.expense.delete({ where: { id: expenseId } }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return {};
}