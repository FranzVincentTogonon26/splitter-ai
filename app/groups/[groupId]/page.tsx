import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getGroupView } from "@/lib/queries";
import { resolveDisplay } from "@/lib/fx";
import { ensureUser } from "@/lib/ensure-user";
import GroupClient from "@/components/group-client";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ currency?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { groupId } = await params;
  const { currency } = await searchParams;
  await ensureUser();
  const display = await resolveDisplay(currency);
  const groupView = await getGroupView(groupId, userId, display);

  return (
    <GroupClient
      groupView={groupView}
      groupId={groupId}
      currentUserId={userId}
    />
  );
}