"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import {
  getGroupById,
  getGroupMemberIds,
  insertEqualExpense,
  insertSettlement,
} from "@/lib/mock-db";
import { netBalances } from "@/lib/queries";

export type AddExpenseState = { ok?: boolean; error?: string };

export async function addExpense(
  groupId: string,
  _prev: AddExpenseState,
  formData: FormData,
): Promise<AddExpenseState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const memberIds = getGroupMemberIds(groupId);
  if (!getGroupById(groupId) || !memberIds.includes(userId)) {
    return { error: "Group not found" };
  }

  const description = String(formData.get("description") ?? "").trim();
  const amountCents = Math.round(Number(formData.get("amount")) * 100);
  const paidById = String(formData.get("paidBy") ?? "");
  const splitIds = formData.getAll("members").map(String);

  if (!description) return { error: "Enter a description" };
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { error: "Enter an amount greater than 0" };
  }
  if (!memberIds.includes(paidById)) return { error: "Choose who paid" };
  if (splitIds.length === 0) return { error: "Select at least one member" };
  if (splitIds.some((id) => !memberIds.includes(id))) {
    return { error: "Select at least one member" };
  }

  insertEqualExpense({
    groupId,
    paidById,
    description,
    amountCents,
    memberIds: splitIds,
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

  const memberIds = getGroupMemberIds(groupId);
  if (!getGroupById(groupId) || !memberIds.includes(userId)) {
    return { error: "Group not found" };
  }
  if (!memberIds.includes(fromUserId) || !memberIds.includes(toUserId)) {
    return { error: "Group not found" };
  }

  const owed = -(netBalances(groupId).get(fromUserId) ?? 0);
  if (amountCents <= 0 || amountCents > owed) {
    return { error: "Nothing to settle" };
  }

  insertSettlement({
    groupId,
    fromUserId,
    toUserId,
    amountCents,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return {};
}
