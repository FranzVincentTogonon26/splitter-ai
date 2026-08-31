"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";

export type CreateGroupState = { error?: string; groupId?: string };

export async function createGroup(
  formData: FormData,
): Promise<CreateGroupState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a group name" };

  const group = await db.$transaction(async (tx) => {
    const created = await tx.group.create({ data: { name } });
    await tx.groupMember.create({
      data: { groupId: created.id, userId, role: "admin" },
    });
    return created;
  });

  revalidatePath("/dashboard");
  // No server redirect: the client shows a success toast and navigates
  // itself (nextjs-review #12 — router.push when a toast follows).
  return { groupId: group.id };
}

export type AddMemberState = { error?: string };

export async function addMember(
  groupId: string,
  _prev: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { members: { where: { userId } } },
  });
  if (!group || group.members.length === 0) {
    return { error: "Group not found" };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter a valid email" };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No Splitter account with that email" };

  const existing = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (existing) return { error: `${user.name} is already a member` };

  await db.groupMember.create({
    data: { groupId, userId: user.id, role: "member" },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return {};
}