"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  findUserByEmail,
  getGroupMemberIds,
  getGroupById,
  getUserById,
  insertGroup,
  insertGroupMember,
} from "@/lib/mock-db";

export async function createGroup(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const group = insertGroup(name, userId);
  revalidatePath("/dashboard");
  redirect(`/groups/${group.id}`);
}

export type AddMemberState = { error?: string };

export async function addMember(
  groupId: string,
  _prev: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  if (!getGroupById(groupId) || !getGroupMemberIds(groupId).includes(userId)) {
    return { error: "Group not found" };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter a valid email" };
  }

  const user = findUserByEmail(email);
  if (!user) return { error: "No Splitter account with that email" };

  if (getGroupMemberIds(groupId).includes(user.id)) {
    return { error: `${getUserById(user.id)?.name ?? "That person"} is already a member` };
  }

  insertGroupMember(groupId, user.id);
  revalidatePath(`/groups/${groupId}`);
  return {};
}
