import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getGroupView } from "@/lib/queries";
import { ensureCurrentUser } from "@/lib/mock-db";
import GroupClient from "@/components/group-client";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { groupId } = await params;
  await ensureCurrentUser();
  const groupView = getGroupView(groupId, userId);

  return (
    <GroupClient
      groupView={groupView}
      groupId={groupId}
      currentUserId={userId}
    />
  );
}