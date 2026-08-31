import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { CreateGroupForm } from "@/components/create-group-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BalancePill } from "@/components/balance-pill";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelect } from "@/components/currency-select";
import { resolveDisplay } from "@/lib/fx";
import { formatMoneyIn } from "@/lib/format";
import { ensureUser } from "@/lib/ensure-user";
import { getDashboard } from "@/lib/queries";
import type { DashboardGroupCard } from "@/lib/types";

function GroupCard({
  card,
  displayCode,
}: {
  card: DashboardGroupCard;
  displayCode: string;
}) {
  return (
    <Card className="h-full rounded-xl hover:shadow-md  border-border">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold truncate">{card.group.name}</h3>
          <BalancePill cents={card.yourBalanceCents} currencyCode={displayCode} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {card.members.slice(0, 5).map((user) => (
              <Avatar key={user.id} className="h-9 w-9 ring-2 ring-background">
                <AvatarImage src={user.imageUrl ?? undefined} alt={user.name} />
                <AvatarFallback seed={user.id}>{user.name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {card.members.length > 5 && (
              <Avatar className="h-9 w-9 ring-2 ring-background">
                <AvatarFallback>+{card.members.length - 5}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <p className="text-lg text-muted-foreground whitespace-nowrap">
            {formatMoneyIn(displayCode, card.totalCents)} total
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await ensureUser();
  if (!user) redirect("/sign-in");
  const firstName = user.name.split(" ")[0];

  // The ?currency= param drives display conversion; unknown codes or a rates
  // outage degrade to USD (flagged so we can say why).
  const { currency } = await searchParams;
  const display = await resolveDisplay(currency);
  const dashboard = await getDashboard(userId, firstName, display);
  const fm = (usdCents: number) =>
    formatMoneyIn(dashboard.displayCode, usdCents);

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome back, {firstName} 👋
        </h1>
        <CurrencySelect />
      </div>

      {display.fellBackToUsd && (
        <p className="mt-3 text-sm text-amber-600">
          Exchange rates unavailable — showing amounts in USD.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 max-w-[480px]">
        <Card className="rounded-xl   border-border">
          <CardContent className="p-6">
            <p className="text-lg text-muted-foreground">You are owed</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600 tabular-nums">
              {fm(dashboard.totalOwedToYouCents)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl  border-border">
          <CardContent className="p-6">
            <p className="text-lg text-muted-foreground">You owe</p>
            <p className="mt-2 text-3xl font-semibold text-rose-600 tabular-nums">
              {fm(dashboard.totalYouOweCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Your groups</h2>
        <CreateGroupForm />
      </div>

      {dashboard.groups.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No groups yet</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {dashboard.groups.map((card) => (
            <Link key={card.group.id} href={`/groups/${card.group.id}`}>
              <GroupCard card={card} displayCode={dashboard.displayCode} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
