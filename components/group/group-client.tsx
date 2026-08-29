"use client";

import { useState, useTransition } from "react"
import { formatMoney } from "@/lib/format"
import { GroupView } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Pencil, Sparkles, Users, CreditCard } from "lucide-react"
import { settleUp, type SettleUpState } from "@/app/actions/expenses"
import { addMember } from "@/app/actions/groups"
import { ExpenseModal } from "@/components/expense-modal"

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
]

function formatBalance(cents: number) {
  return formatMoney(Math.abs(cents))
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
  )
}

function ExpenseRow({
  expense,
  isRecent,
  onEdit,
  onDelete,
}: {
  expense: GroupView["expenses"][0]
  isRecent: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border hover:bg-muted/30 transition-colors">
      {isRecent && <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{expense.description}</p>
        <p className="text-sm text-muted-foreground">
          Paid by {expense.payerName} &bull; {expense.dateLabel}
        </p>
      </div>
      <div className="flex items-center gap-2 text-right flex-shrink-0">
        <span className="font-medium">{expense.paidLabel}</span>
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          Your share: {formatMoney(expense.yourShareCents)}
        </Badge>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit expense">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete expense">
          <Trash2 className="h-4 w-4 text-rose-500" />
        </Button>
      </div>
    </div>
  )
}

function DebtRow({
  debt,
  members,
  currentUserId,
  isPending,
  settleAction,
}: {
  debt: GroupView["debts"][0]
  members: GroupView["members"]
  currentUserId: string
  isPending: boolean
  settleAction: (fromUserId: string, toUserId: string, amountCents: number) => (formData: FormData) => Promise<SettleUpState>
}) {
  const fromUser = members.find((m) => m.user.id === debt.fromUserId)
  const toUser = members.find((m) => m.user.id === debt.toUserId)
  const fromName = fromUser?.user.id === currentUserId ? "You" : fromUser?.user.name ?? "Unknown"
  const toName = toUser?.user.id === currentUserId ? "You" : toUser?.user.name ?? "Unknown"
  const involvesCurrentUser = debt.fromUserId === currentUserId || debt.toUserId === currentUserId

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex -space-x-2 flex-shrink-0">
          <Avatar className="ring-2 ring-background h-9 w-9">
            <AvatarImage src={fromUser?.user.imageUrl ?? undefined} alt={fromName} />
            <AvatarFallback className="text-sm font-medium">{fromName[0]}</AvatarFallback>
          </Avatar>
          <Avatar className="ring-2 ring-background h-9 w-9">
            <AvatarImage src={toUser?.user.imageUrl ?? undefined} alt={toName} />
            <AvatarFallback className="text-sm font-medium">{toName[0]}</AvatarFallback>
          </Avatar>
        </div>
        <span className="font-medium text-sm truncate">{fromName} pays {toName}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-medium text-lg tabular-nums">{formatMoney(debt.amountCents)}</span>
        {involvesCurrentUser && (
          <form action={settleAction(debt.fromUserId, debt.toUserId, debt.amountCents) as unknown as (formData: FormData) => Promise<void>}>
            <Button type="submit" size="sm" disabled={isPending} className="whitespace-nowrap">
              {isPending ? "Settling..." : "Settle up"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

function MemberRow({
  member,
  isCurrentUser,
  onRemove,
}: {
  member: GroupView["members"][0]
  isCurrentUser: boolean
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
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
  )
}

interface GroupClientProps {
  groupView: GroupView
  groupId: string
  currentUserId: string
}

export default function GroupClient({ groupView, groupId, currentUserId }: GroupClientProps) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<GroupView["expenses"][0] | null>(null)
  const [isAddMemberPending, startAddMemberTransition] = useTransition()
  const [addMemberError, setAddMemberError] = useState("")

  const makeSettleAction = (fromUserId: string, toUserId: string, amountCents: number) => {
    return async () => {
      return settleUp(groupId, fromUserId, toUserId, amountCents)
    }
  }

  const handleAddExpense = () => {
    setEditingExpense(null)
    setIsExpenseModalOpen(true)
  }

  const handleEditExpense = (expense: GroupView["expenses"][0]) => {
    setEditingExpense(expense)
    setIsExpenseModalOpen(true)
  }

  const handleExpenseSaved = () => {
    setIsExpenseModalOpen(false)
    setEditingExpense(null)
  }

  const handleAddMember = (formData: FormData) => {
    startAddMemberTransition(async () => {
      const result = await addMember(groupId, { error: "" }, formData)
      if (result.error) setAddMemberError(result.error)
    })
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{groupView.group.name}</h1>
          <p className="text-muted-foreground">{groupView.members.length} members</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Badge variant={groupView.yourBalanceCents >= 0 ? "success" : "warning"} className="text-lg px-4 py-2">
            {groupView.yourBalanceCents >= 0 ? "+" : ""}{formatBalance(groupView.yourBalanceCents)}
          </Badge>
          <CurrencySelector selectedCurrency="USD" onChange={() => {}} />
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
                      // eslint-disable-next-line react-hooks/purity
                      const isRecent = new Date(item.data.dateLabel).getTime() > Date.now() - 60_000
                      return (
                        <ExpenseRow
                          key={item.data.id}
                          expense={item.data}
                          isRecent={isRecent}
                          onEdit={() => handleEditExpense(item.data)}
                          onDelete={() => {}}
                        />
                      )
                    }
                    return null
                  })}
                {groupView.expenses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses yet. Click &ldquo;Add expense&rdquo; to get started.
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
                    settleAction={makeSettleAction}
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
          setIsExpenseModalOpen(false)
          setEditingExpense(null)
        }}
        groupId={groupId}
        members={groupView.members}
        currentUserId={currentUserId}
        editingExpense={editingExpense}
        onSaved={handleExpenseSaved}
      />
    </div>
  )
}