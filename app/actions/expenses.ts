"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { netBalances } from "@/lib/queries";
import { computeSplits, splitsFromFormData } from "@/lib/splits";

export type AddExpenseState = { ok?: boolean; error?: string };

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

  const description = String(formData.get("description") ?? "").trim();
  const amountCents = Math.round(Number(formData.get("amount")) * 100);
  const paidById = String(formData.get("paidBy") ?? "");
  const { mode, memberIds: splitIds, percentages, exactCents } =
    splitsFromFormData(formData);

  if (!description) return { error: "Enter a description" };
  if (!memberIds.includes(paidById)) return { error: "Choose who paid" };

  const result = computeSplits({
    amountCents,
    memberIds: splitIds,
    allowedIds: memberIds,
    mode,
    percentages,
    exactCents,
  });
  if (!result.ok) return { error: result.error };

  await db.expense.create({
    data: {
      groupId,
      paidById,
      description,
      amountCents,
      splits: { create: result.splits },
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