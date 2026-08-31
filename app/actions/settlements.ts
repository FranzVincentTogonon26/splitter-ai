"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";

export type DeleteSettlementState = { error?: string };

/**
 * Delete one settlement. Group-scoped: the caller must be a member of the
 * group the settlement belongs to, and the row is re-checked against that
 * groupId so cross-group deletes by guessing ids fail cleanly. A recorded
 * payment is its own fact (architecture invariant) — it is removed
 * explicitly here, never cascaded to by an expense delete.
 */
export async function deleteSettlement(
  groupId: string,
  settlementId: string,
): Promise<DeleteSettlementState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const membership = await db.groupMember.findFirst({
    where: { groupId, userId },
  });
  if (!membership) return { error: "Group not found" };

  const settlement = await db.settlement.findUnique({
    where: { id: settlementId },
  });
  if (!settlement || settlement.groupId !== groupId) {
    return { error: "Settlement not found" };
  }

  await db.settlement.delete({ where: { id: settlementId } });

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return {};
}