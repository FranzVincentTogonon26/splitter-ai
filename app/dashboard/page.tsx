import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/queries";
import { ensureCurrentUser } from "@/lib/mock-db";
import { formatMoney } from "@/lib/format";
import { DashboardView } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
];

function formatBalance(cents: number) {
  return formatMoney(Math.abs(cents));
}

function BalanceTile({ label, amount, variant }: { label: string; amount: number; variant: "owed" | "owes" }) {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-semibold tracking-tight ${variant === "owed" ? "text-emerald-600" : "text-rose-600"}`}>
          {formatBalance(amount)}
        </p>
      </CardContent>
    </Card>
  );
}

function CurrencySelector({ selectedCurrency, onChange }: { selectedCurrency: string; onChange: (currency: string) => void }) {
  return (
    <Select value={selectedCurrency} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <div className="flex items-center gap-2">
              <span className="font-mono">{c.symbol}</span>
              <span>{c.code}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GroupCard({ group, yourBalanceCents, totalCents, members }: DashboardView["groups"][0]) {
  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <Badge variant={yourBalanceCents >= 0 ? "success" : "warning"}>
            {yourBalanceCents >= 0 ? "+" : ""}{formatBalance(yourBalanceCents)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          {members.slice(0, 4).map((user) => (
            <Avatar key={user.id} className="ring-2 ring-background -ml-1 first:ml-0">
              <AvatarImage src={user.imageUrl ?? undefined} alt={user.name} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
          ))}
          {members.length > 4 && (
            <Avatar className="ring-2 ring-background -ml-1">
              <AvatarFallback>+{members.length - 4}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <Separator />
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">Group total</span>
          <span className="text-sm font-medium">{formatMoney(totalCents)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateGroupForm() {
  return (
    <form action={async (formData: FormData) => {
      "use server";
      const { createGroup } = await import("@/app/actions/groups");
      await createGroup(formData);
    }} className="flex gap-2">
      <input
        name="name"
        type="text"
        placeholder="Group name"
        className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        required
      />
      <Button type="submit" size="sm">Create</Button>
    </form>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  const firstName = user.name.split(" ")[0];
  const dashboard = getDashboard(userId, firstName);

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome, {firstName}</h1>
        <CurrencySelector selectedCurrency="USD" onChange={() => {}} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BalanceTile label="You are owed" amount={dashboard.totalOwedToYouCents} variant="owed" />
        <BalanceTile label="You owe" amount={dashboard.totalYouOweCents} variant="owes" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your groups</h2>
        </div>

        {dashboard.groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No groups yet</p>
              <CreateGroupForm />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dashboard.groups.map((group) => (
              <Link key={group.group.id} href={`/groups/${group.group.id}`}>
                <GroupCard {...group} />
              </Link>
            ))}
            <Link href="/groups/new" className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">
              <span className="text-3xl">+</span>
              <span className="font-medium">Create group</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}