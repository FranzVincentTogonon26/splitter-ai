"use client"

import { useState, useTransition } from "react";
import { formatMoney, formatDate } from "@/lib/format";
import { GroupView } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Pencil, HandCoins, Sparkles, Users, CreditCard } from "lucide-react";
import { addExpense, settleUp } from "@/app/actions/expenses";
import { addMember } from "@/app/actions/groups";
import { ExpenseModal } from "@/components/expense-modal";

function formatBalance(cents: number) {
  return formatMoney(Math.abs(cents));
}

function ExpenseRow({
  expense,
  isRecent,
  onEdit,
  onDelete,
}: {
  expense: GroupView["expenses"][0];
  isRecent: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
      {isRecent && <Sparkles className="h-4 w-4 text-amber-500" />}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{expense.description}</p>
        <p className="text-sm text-muted-foreground">
          Paid by {expense.payerName} • {expense.dateLabel}
        </p>
      </div>
      <div className="flex items-center gap-2 text-right">
        <span className="font-medium">{expense.paidLabel}</span>
        <Badge variant="outline" className="text-xs">
          Your share: {formatMoney(expense.yourShareCents)}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit expense">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete expense">
          <Trash2 className="h-4 w-4 text-rose-500" />
        </Button>
      </div>
    </div>
  );
}

function SettlementRow({
  settlement,
  members,
  currentUserId,
  onDelete,
}: {
  settlement: { fromUserId: string; toUserId: string; amountCents: number; createdAt: Date; id: string };
  members: GroupView["members"];
  currentUserId: string;
  onDelete: () => void;
}) {
  const fromUser = members.find((m) => m.user.id === settlement.fromUserId);
  const toUser = members.find((m) => m.user.id === settlement.toUserId);
  const fromName = fromUser?.user.id === currentUserId ? "You" : fromUser?.user.name ?? "Unknown";
  const toName = toUser?.user.id === currentUserId ? "You" : toUser?.user.name ?? "Unknown";

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
      <HandCoins className="h-4 w-4 text-secondary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{fromName} paid {toName}</p>
        <p className="text-sm text-muted-foreground">{formatDate(settlement.createdAt)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-secondary">{formatMoney(settlement.amountCents)}</span>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete settlement">
          <Trash2 className="h-4 w-4 text-rose-500" />
        </Button>
      </div>
    </div>
  );
}

function DebtRow({
  debt,
  members,
  currentUserId,
  isPending,
}: {
  debt: GroupView["debts"][0];
  members: GroupView["members"];
  currentUserId: string;
  isPending: boolean;
}) {
  const fromUser = members.find((m) => m.user.id === debt.fromUserId);
  const toUser = members.find((m) => m.user.id === debt.toUserId);
  const fromName = fromUser?.user.id === currentUserId ? "You" : fromUser?.user.name ?? "Unknown";
  const toName = toUser?.user.id === currentUserId ? "You" : toUser?.user.name ?? "Unknown";
  const involvesCurrentUser = debt.fromUserId === currentUserId || debt.toUserId === currentUserId;

  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <Avatar className="ring-2 ring-background">
            <AvatarImage src={fromUser?.user.imageUrl ?? undefined} alt={fromName} />
            <AvatarFallback>{fromName[0]}</AvatarFallback>
          </Avatar>
          <Avatar className="ring-2 ring-background">
            <AvatarImage src={toUser?.user.imageUrl ?? undefined} alt={toName} />
            <AvatarFallback>{toName[0]}</AvatarFallback>
          </Avatar>
        </div>
        <span className="text-sm font-medium">{fromName} → {toName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{formatMoney(debt.amountCents)}</span>
        {involvesCurrentUser && (
          <form
            action={async (formData: FormData) => {
              "use server";
              const { settleUp } = await import("@/app/actions/expenses");
              const groupId = formData.get("groupId") as string;
              const fromUserId = formData.get("fromUserId") as string;
              const toUserId = formData.get("toUserId") as string;
              const amountCents = Number(formData.get("amountCents"));
              await settleUp(groupId, fromUserId, toUserId, amountCents);
            }}
          >
            <input type="hidden" name="groupId" value={debt.fromUserId} />
            <input type="hidden" name="fromUserId" value={debt.fromUserId} />
            <input type="hidden" name="toUserId" value={debt.toUserId} />
            <input type="hidden" name="amountCents" value={debt.amountCents.toString()} />
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Settling..." : "Settle up"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  onRemove,
}: {
  member: GroupView["members"][0];
  isCurrentUser: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={member.user.imageUrl ?? undefined} alt={member.user.name} />
          <AvatarFallback>{member.user.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{member.user.name} {isCurrentUser && "(You)"}</p>
          <p className="text-sm text-muted-foreground">{member.user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {member.role}
        </Badge>
        {!isCurrentUser && (
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove member">
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface GroupClientProps {
  groupView: GroupView;
  groupId: string;
  currentUserId: string;
}

export default function GroupClient({ groupView, groupId, currentUserId }: GroupClientProps) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupView["expenses"][0] | null>(null);
  const [isAddMemberPending, startAddMemberTransition] = useTransition();
  const [addMemberError, setAddMemberError] = useState("");

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: GroupView["expenses"][0]) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleExpenseSaved = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleAddMember = (formData: FormData) => {
    startAddMemberTransition(async () => {
      const result = await addMember(groupId, { error: "" }, formData);
      if (result.error) setAddMemberError(result.error);
    });
  };

  const oneMinuteAgo = new Date(Date.now() - 60_000);

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{groupView.group.name}</h1>
          <p className="text-muted-foreground">{groupView.members.length} members</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={groupView.yourBalanceCents >= 0 ? "success" : "warning"}>
            {groupView.yourBalanceCents >= 0 ? "+" : ""}{formatBalance(groupView.yourBalanceCents)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Activity</CardTitle>
              <Button onClick={handleAddExpense}>
                <CreditCard className="mr-2 h-4 w-4" />
                Add expense
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[500px] space-y-3 pr-2">
                {groupView.expenses
                  .map((e) => ({ type: "expense" as const, data: e, date: new Date(e.dateLabel) }))
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((item) => {
                    if (item.type === "expense") {
                      const isRecent = new Date(item.data.dateLabel) > oneMinuteAgo;
                      return (
                        <ExpenseRow
                          key={item.data.id}
                          expense={item.data}
                          isRecent={isRecent}
                          onEdit={() => handleEditExpense(item.data)}
                          onDelete={() => {}}
                        />
                      );
                    }
                    return null;
                  })}
                {groupView.expenses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses yet. Click "Add expense" to get started.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Who owes whom</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {groupView.debts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">All settled up!</p>
              ) : (
                groupView.debts.map((debt) => (
                  <DebtRow
                    key={`${debt.fromUserId}-${debt.toUserId}`}
                    debt={debt}
                    members={groupView.members}
                    currentUserId={currentUserId}
                    isPending={false}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {groupView.members.map((member) => (
                <MemberRow
                  key={member.user.id}
                  member={member}
                  isCurrentUser={member.user.id === currentUserId}
                  onRemove={() => {}}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Add member</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form action={handleAddMember} className="space-y-2">
                {addMemberError && <p className="text-sm text-rose-500">{addMemberError}</p>}
                <div className="flex gap-2">
                  <input
                    name="email"
                    type="email"
                    placeholder="Email address"
                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required
                  />
                  <Button type="submit" size="sm" disabled={isAddMemberPending}>
                    {isAddMemberPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        groupId={groupId}
        members={groupView.members}
        currentUserId={currentUserId}
        editingExpense={editingExpense}
        onSaved={handleExpenseSaved}
      />
    </div>
  );
}