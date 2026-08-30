"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { netBalances } from "@/lib/queries";

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

  // Equal split with exact-sum reconciliation (flexible modes land in phase 06).
  const unique = [...new Set(splitIds)];
  if (unique.length !== splitIds.length) {
    return { error: "Select each member once" };
  }

  const n = unique.length;
  const base = Math.floor(amountCents / n);
  let remainder = amountCents - base * n;
  const splits = unique.map((memberId) => {
    const share = remainder > 0 ? base + 1 : base;
    remainder -= remainder > 0 ? 1 : 0;
    return { userId: memberId, amountCents: share };
  });

  await db.expense.create({
    data: {
      groupId,
      paidById,
      description,
      amountCents,
      splits: { create: splits },
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