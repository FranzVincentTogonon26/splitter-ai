"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { addExpense } from "@/app/actions/expenses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import type { GroupView } from "@/lib/types";

// The 20 ECB currencies (phase 07 converts at save time via frankfurter.dev).
const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "INR", symbol: "₹" },
  { code: "CNY", symbol: "¥" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "CHF", symbol: "CHF" },
  { code: "SGD", symbol: "S$" },
  { code: "HKD", symbol: "HK$" },
  { code: "KRW", symbol: "₩" },
  { code: "BRL", symbol: "R$" },
  { code: "MXN", symbol: "MX$" },
  { code: "ZAR", symbol: "R" },
  { code: "NOK", symbol: "kr" },
  { code: "SEK", symbol: "kr" },
  { code: "DKK", symbol: "kr" },
  { code: "PLN", symbol: "zł" },
  { code: "CZK", symbol: "Kč" },
];

type SplitMode = "equal" | "percentage" | "exact";

const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "equally" },
  { value: "percentage", label: "by percentages" },
  { value: "exact", label: "by exact amounts" },
];

export function ExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  currentUserId,
  editingExpense = null,
  onSaved,
}: ExpenseModalProps) {
  const [isPending, startTransition] = React.useTransition();

  const [description, setDescription] = React.useState(
    editingExpense?.description ?? "",
  );
  const [amount, setAmount] = React.useState(
    editingExpense ? (editingExpense.amountCents / 100).toString() : "",
  );
  const [currency, setCurrency] = React.useState("USD");
  const [paidBy, setPaidBy] = React.useState(
    editingExpense?.paidById ?? currentUserId,
  );
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>(
    members.map((m) => m.user.id),
  );
  const [splitMode, setSplitMode] = React.useState<SplitMode>("equal");
  const [percentages, setPercentages] = React.useState<Record<string, number>>(
    {},
  );
  const [exactAmounts, setExactAmounts] = React.useState<Record<string, number>>(
    {},
  );
  const [aiText, setAiText] = React.useState("");

  const [state, formAction] = React.useActionState(
    async (_: unknown, formData: FormData) => {
      return addExpense(groupId, { error: "" }, formData);
    },
    { error: "" },
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("description", description);
    formData.set("amount", amount);
    formData.set("paidBy", paidBy);
    selectedMembers.forEach((id) => formData.append("members", id));
    startTransition(() => {
      formAction(formData);
    });
  };

  React.useEffect(() => {
    if (typeof state === "object" && state !== null && "ok" in state && state.ok) {
      onSaved();
    }
  }, [state, onSaved]);

  if (!isOpen) return null;

  const totalAmount = Math.round(Number(amount) * 100);
  const selectedMemberObjects = members.filter((m) =>
    selectedMembers.includes(m.user.id),
  );
  const memberCount = selectedMemberObjects.length;

  const equalShare = memberCount > 0 ? Math.floor(totalAmount / memberCount) : 0;
  const remainder =
    memberCount > 0 ? totalAmount - equalShare * memberCount : 0;

  const totalPercentage = Object.values(percentages).reduce((a, b) => a + b, 0);
  const totalExact = Object.values(exactAmounts).reduce((a, b) => a + b, 0);

  const canSubmit =
    Boolean(description.trim()) &&
    totalAmount > 0 &&
    memberCount > 0 &&
    ((splitMode === "equal" && true) ||
      (splitMode === "percentage" && totalPercentage === 100) ||
      (splitMode === "exact" && totalExact === totalAmount));

  const currencySymbol =
    CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      key={`${isOpen}-${editingExpense?.id ?? "new"}`}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editingExpense ? "Edit expense" : "Add an expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {!editingExpense && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Quick add with AI
              </p>
              <div className="flex gap-2">
                <Input
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder={'e.g. "dinner in Tokyo 4500 yen"'}
                  className="border-primary/40"
                />
                <Button type="button" variant="outline" disabled>
                  Parse
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner at the beach shack"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="flex-1"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} <span className="font-mono">{c.symbol}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
            Paid by
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className="w-auto gap-1 border-none bg-transparent px-1 shadow-none text-base font-semibold text-primary focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select payer" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>
                    {m.user.name}
                    {m.user.id === currentUserId ? " (You)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            and split
            <Select
              value={splitMode}
              onValueChange={(v) => setSplitMode(v as SplitMode)}
            >
              <SelectTrigger className="w-auto gap-1 border-none bg-transparent px-1 shadow-none text-base font-semibold text-primary focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPLIT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </p>

          <div className="rounded-xl border divide-y">
            {members.map((member) => (
              <label
                key={member.user.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Checkbox
                  checked={selectedMembers.includes(member.user.id)}
                  onCheckedChange={(checked) =>
                    setSelectedMembers((prev) =>
                      checked
                        ? [...prev, member.user.id]
                        : prev.filter((id) => id !== member.user.id),
                    )
                  }
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={member.user.imageUrl ?? undefined}
                    alt={member.user.name}
                  />
                  <AvatarFallback seed={member.user.id}>
                    {member.user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {member.user.name}
                  {member.user.id === currentUserId ? " (You)" : ""}
                </span>
              </label>
            ))}
          </div>

          {splitMode === "percentage" && (
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <Label>Percentages</Label>
                <span
                  className={`text-sm font-mono tabular-nums ${
                    totalPercentage > 100
                      ? "text-rose-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {totalPercentage}% of 100%
                </span>
              </div>
              {selectedMemberObjects.map((member) => (
                <div key={member.user.id} className="flex items-center gap-3">
                  <span className="w-28 font-medium truncate">
                    {member.user.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={percentages[member.user.id] ?? 0}
                    onChange={(e) =>
                      setPercentages((prev) => ({
                        ...prev,
                        [member.user.id]: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-20 h-10 rounded-md border border-input bg-background px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tabular-nums"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              ))}
            </div>
          )}

          {splitMode === "exact" && (
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <Label>Exact amounts</Label>
                <span className="text-sm font-mono tabular-nums text-muted-foreground">
                  {formatMoney(totalExact)} / {formatMoney(totalAmount)}
                </span>
              </div>
              {selectedMemberObjects.map((member) => (
                <div key={member.user.id} className="flex items-center gap-3">
                  <span className="w-28 font-medium truncate">
                    {member.user.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(exactAmounts[member.user.id] ?? 0) / 100}
                      onChange={(e) =>
                        setExactAmounts((prev) => ({
                          ...prev,
                          [member.user.id]:
                            Math.round(Number(e.target.value) * 100) || 0,
                        }))
                      }
                      className="w-24 h-10 rounded-md border border-input bg-background px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tabular-nums"
                    />
                  </div>
                </div>
              ))}
              {totalExact > totalAmount && (
                <p className="text-sm text-rose-500">
                  Total exceeds expense amount
                </p>
              )}
              {totalExact < totalAmount && (
                <p className="text-sm text-amber-500">
                  {formatMoney(totalAmount - totalExact)} left to assign
                </p>
              )}
            </div>
          )}

          {splitMode === "equal" && memberCount > 0 && totalAmount > 0 && (
            <p className="text-sm text-muted-foreground font-mono tabular-nums">
              {formatMoney(equalShare)} each
              {remainder > 0 && ` · first ${remainder} pay 1¢ more`}
            </p>
          )}

          {typeof state === "object" &&
            state !== null &&
            "error" in state &&
            state.error && (
              <p className="text-sm text-rose-500">{state.error}</p>
            )}

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending
                ? "Saving..."
                : editingExpense
                  ? "Save changes"
                  : "Save expense"}
            </Button>
          </DialogFooter>


        </form>
      </DialogContent>

    </Dialog>
  );
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: GroupView["members"];
  currentUserId: string;
  editingExpense?: GroupView["expenses"][0] | null;
  onSaved: () => void;
}
