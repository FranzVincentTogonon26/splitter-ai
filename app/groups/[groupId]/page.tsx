import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getGroupView } from "@/lib/queries";
import { ensureUser } from "@/lib/ensure-user";
import GroupClient from "@/components/group-client";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { groupId } = await params;
  await ensureUser();
  const groupView = await getGroupView(groupId, userId);

  return (
    <GroupClient
      groupView={groupView}
      groupId={groupId}
      currentUserId={userId}
    />
  );
}