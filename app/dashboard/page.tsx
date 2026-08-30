import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createGroup } from "@/app/actions/groups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BalancePill } from "@/components/balance-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelect } from "@/components/currency-select";
import { formatMoney } from "@/lib/format";
import { ensureCurrentUser } from "@/lib/mock-db";
import { getDashboard } from "@/lib/queries";
import type { DashboardGroupCard } from "@/lib/types";

function GroupCard({ card }: { card: DashboardGroupCard }) {
  return (
    <Card className="h-full rounded-xl transition-shadow hover:shadow-md border border-border">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold truncate">{card.group.name}</h3>
          <BalancePill cents={card.yourBalanceCents} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {card.members.slice(0, 5).map((user) => (
              <Avatar key={user.id} className="h-9 w-9 ring-2 ring-background">
                <AvatarImage src={user.imageUrl ?? undefined} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {card.members.length > 5 && (
              <Avatar className="h-9 w-9 ring-2 ring-background">
                <AvatarFallback>+{card.members.length - 5}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <p className="text-lg text-muted-foreground whitespace-nowrap">
            {formatMoney(card.totalCents)} total
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  const firstName = user.name.split(" ")[0];
  const dashboard = getDashboard(userId, firstName);

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome back, {firstName} 👋
        </h1>
        <CurrencySelect />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 max-w-[480px]">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-6">
            <p className="text-lg text-muted-foreground">You are owed</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600 tabular-nums">
              {formatMoney(dashboard.totalOwedToYouCents)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-6">
            <p className="text-lg text-muted-foreground">You owe</p>
            <p className="mt-2 text-3xl font-semibold text-rose-600 tabular-nums">
              {formatMoney(dashboard.totalYouOweCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Your groups</h2>
        <form action={createGroup} className="flex items-center gap-3">
          <input
            name="name"
            type="text"
            placeholder="New group name..."
            required
            className="h-10 w-52 bg-transparent border border-border px-4 py-5 rounded-lg px-1 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          />
          <Button type="submit">Create group</Button>
        </form>
      </div>

      {dashboard.groups.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No groups yet</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {dashboard.groups.map((card) => (
            <Link key={card.group.id} href={`/groups/${card.group.id}`}>
              <GroupCard card={card} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
