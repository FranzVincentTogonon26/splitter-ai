"use client";

import { useState } from "react";
import { Pencil, Sparkles, Trash2 } from "lucide-react";

import { addMember } from "@/app/actions/groups";
import { settleUp } from "@/app/actions/expenses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BalancePill } from "@/components/balance-pill";
import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/currency-select";
import { ExpenseModal } from "@/components/expense-modal";
import { formatMoney } from "@/lib/format";
import type { GroupView } from "@/lib/types";
import { useTransition } from "react";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold tracking-tight">{children}</h2>;
}

function ExpenseRow({
  expense,
  onEdit,
}: {
  expense: GroupView["expenses"][0];
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4  border-border">
      {expense.isRecent && (
        <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{expense.description}</p>
        <p className="text-muted-foreground">
          {expense.payerName} paid {expense.paidLabel} · {expense.dateLabel}
        </p>
      </div>
      <p className="text-muted-foreground whitespace-nowrap">
        your share {formatMoney(expense.yourShareCents)}
      </p>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="Edit expense"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled
          aria-label="Delete expense"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SettleButton({
  groupId,
  fromUserId,
  toUserId,
  amountCents,
}: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      className="border-0 bg-muted text-foreground hover:bg-muted/70"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await settleUp(groupId, fromUserId, toUserId, amountCents);
        })
      }
    >
      {pending ? "Settling..." : "Settle up"}
    </Button>
  );
}

function DebtRow({
  debt,
  members,
  currentUserId,
  groupId,
}: {
  debt: GroupView["debts"][0];
  members: GroupView["members"];
  currentUserId: string;
  groupId: string;
}) {
  const fromName =
    debt.fromUserId === currentUserId
      ? "You"
      : (members.find((m) => m.user.id === debt.fromUserId)?.user.name ??
        "Unknown");
  const toName =
    debt.toUserId === currentUserId
      ? "You"
      : (members.find((m) => m.user.id === debt.toUserId)?.user.name ??
        "Unknown");

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <p className="font-semibold min-w-0">
        <span className="truncate">{fromName}</span>
        <span className="font-normal text-muted-foreground"> owes </span>
        <span className="truncate">{toName}</span>
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`font-bold tabular-nums ${
            debt.toUserId === currentUserId
              ? "text-emerald-600"
              : "text-rose-600"
          }`}
        >
          {formatMoney(debt.amountCents)}
        </span>
        {(debt.fromUserId === currentUserId ||
          debt.toUserId === currentUserId) && (
          <SettleButton
            groupId={groupId}
            fromUserId={debt.fromUserId}
            toUserId={debt.toUserId}
            amountCents={debt.amountCents}
          />
        )}
      </div>
    </div>
  );
}

export default function GroupClient({
  groupView,
  groupId,
  currentUserId,
}: {
  groupView: GroupView;
  groupId: string;
  currentUserId: string;
}) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");
  const [isAddMemberPending, startAddMemberTransition] = useTransition();

  const handleAddMember = (formData: FormData) => {
    setAddMemberError("");
    startAddMemberTransition(async () => {
      const result = await addMember(groupId, { error: "" }, formData);
      if (result.error) setAddMemberError(result.error);
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {groupView.group.name}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {groupView.members.slice(0, 5).map((member) => (
                <Avatar
                  key={member.user.id}
                  className="h-9 w-9 ring-2 ring-background"
                >
                  <AvatarImage
                    src={member.user.imageUrl ?? undefined}
                    alt={member.user.name}
                  />
                  <AvatarFallback seed={member.user.id}>
                    {member.user.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <BalancePill cents={groupView.yourBalanceCents} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelect />
          <Button type="button" onClick={() => setIsExpenseModalOpen(true)}>
            Add expense
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4 self-start">
          <SectionHeading>Activity</SectionHeading>
          {groupView.expenses.length === 0 ? (
            <p className="text-muted-foreground">No expenses yet</p>
          ) : (
            <div className="rounded-xl border divide-y border-border">
              {groupView.expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onEdit={() => setIsExpenseModalOpen(true)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-10">
          <section className="space-y-4">
            <SectionHeading>Who owes whom</SectionHeading>
            {groupView.debts.length === 0 ? (
              <p className="text-muted-foreground">All settled up!</p>
            ) : (
              <div className="rounded-xl border divide-y border border-border">
                {groupView.debts.map((debt) => (
                  <DebtRow
                    key={`${debt.fromUserId}-${debt.toUserId}`}
                    debt={debt}
                    members={groupView.members}
                    currentUserId={currentUserId}
                    groupId={groupId}
                  />
                ))}
              </div>
            )}
          </section>

          <hr className="border-border" />

          <section className="space-y-4">
            <SectionHeading>Members</SectionHeading>
            <div>
              {groupView.members.map((member) => (
                <div
                  key={member.user.id}
                  className="flex items-center gap-3 py-3"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={member.user.imageUrl ?? undefined}
                      alt={member.user.name}
                    />
                    <AvatarFallback seed={member.user.id}>
                      {member.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold truncate">
                    {member.user.id === currentUserId
                      ? "You"
                      : member.user.name}
                  </p>
                  <p className="ml-auto text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                </div>
              ))}
            </div>

            <form
              action={handleAddMember}
              className="flex items-center gap-3 pt-2"
            >
              <div className="flex-1 min-w-0">
                <input
                  name="email"
                  type="email"
                  placeholder="friend@example.com"
                  required
                  className="w-full px-4 py-2 text-sm rounded-lg border border-border bg-transparent  text-base placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                />
                {addMemberError && (
                  <p className="mt-1 text-sm text-rose-500">{addMemberError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="border-0 bg-muted text-foreground hover:bg-muted/70"
                disabled={isAddMemberPending}
              >
                {isAddMemberPending ? "Adding..." : "Add member"}
              </Button>
            </form>
          </section>
        </div>
      </div>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        groupId={groupId}
        members={groupView.members}
        currentUserId={currentUserId}
        onSaved={() => setIsExpenseModalOpen(false)}
      />
    </div>
  );
}
