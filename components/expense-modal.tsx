"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useActionState, useTransition } from "react";
import { addExpense } from "@/app/actions/expenses";
import { formatMoney } from "@/lib/format";
import { GroupView } from "@/lib/types";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "zł", name: "Polish Złoty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
];

export function ExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  currentUserId,
  editingExpense,
  onSaved,
}: ExpenseModalProps) {
  const [isPending, startTransition] = useTransition();

  const initialDescription = editingExpense?.description ?? "";
  const initialAmount = editingExpense ? (editingExpense.yourShareCents / 100).toString() : "";
  const initialPaidBy = editingExpense
    ? members.find((m) => m.user.name === editingExpense.payerName)?.user.id ?? currentUserId
    : currentUserId;
  const initialSelectedMembers = editingExpense ? members.map((m) => m.user.id) : members.map((m) => m.user.id);

  const [description, setDescription] = React.useState(initialDescription);
  const [amount, setAmount] = React.useState(initialAmount);
  const [currency, setCurrency] = React.useState("USD");
  const [paidBy, setPaidBy] = React.useState(initialPaidBy);
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>(initialSelectedMembers);
  const [splitMode, setSplitMode] = React.useState<"equal" | "percentage" | "exact">("equal");
  const [percentages, setPercentages] = React.useState<Record<string, number>>({});
  const [exactAmounts, setExactAmounts] = React.useState<Record<string, number>>({});

  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      return addExpense(groupId, { error: "" }, formData);
    },
    { error: "" }
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

  const totalAmount = Number(amount) * 100;
  const selectedMemberObjects = members.filter((m) => selectedMembers.includes(m.user.id));
  const memberCount = selectedMemberObjects.length;

  const equalShare = memberCount > 0 ? Math.floor(totalAmount / memberCount) : 0;
  const remainder = memberCount > 0 ? totalAmount - equalShare * memberCount : 0;

  const totalPercentage = Object.values(percentages).reduce((a, b) => a + b, 0);
  const totalExact = Object.values(exactAmounts).reduce((a, b) => a + b, 0);

  const canSubmit =
    description.trim() &&
    totalAmount > 0 &&
    memberCount > 0 &&
    ((splitMode === "equal" && true) ||
      (splitMode === "percentage" && totalPercentage === 100) ||
      (splitMode === "exact" && totalExact === totalAmount));

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";

  return (
    <Dialog open={isOpen} onOpenChange={onClose} key={`${isOpen}-${editingExpense?.id ?? "new"}`}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">{editingExpense ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at beach shack"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="amount" className="font-medium">Amount</Label>
              <div className="flex gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
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
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidBy" className="font-medium">Paid by</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payer" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user.id} value={m.user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={m.user.imageUrl ?? undefined} alt={m.user.name} />
                          <AvatarFallback>{m.user.name[0]}</AvatarFallback>
                        </Avatar>
                        {m.user.name} {m.user.id === currentUserId && "(You)"}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="font-medium">Split between</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <label
                    key={member.user.id}
                    className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent cursor-pointer bg-muted/30"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.user.id)}
                      onCheckedChange={(checked) =>
                        setSelectedMembers((prev) =>
                          checked ? [...prev, member.user.id] : prev.filter((id) => id !== member.user.id)
                        )
                      }
                    />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.user.imageUrl ?? undefined} alt={member.user.name} />
                      <AvatarFallback>{member.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.user.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-medium">Split mode</Label>
              <div className="flex gap-2 flex-wrap">
                {(["equal", "percentage", "exact"] as const).map((mode) => (
                  <label
                    key={mode}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="splitMode"
                      value={mode}
                      checked={splitMode === mode}
                      onChange={() => setSplitMode(mode)}
                      className="sr-only peer"
                    />
                    <span className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                      splitMode === mode
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border hover:bg-accent"
                    }`}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {splitMode === "percentage" && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Percentages (must sum to 100%)</Label>
                  <span className={`text-sm font-mono tabular-nums ${totalPercentage > 100 ? "text-rose-500" : "text-muted-foreground"}`}>
                    Total: {totalPercentage}%
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedMemberObjects.map((member) => (
                    <div key={member.user.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.imageUrl ?? undefined} alt={member.user.name} />
                        <AvatarFallback>{member.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="w-28 font-medium truncate">{member.user.name}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={percentages[member.user.id] ?? 0}
                        onChange={(e) =>
                          setPercentages((prev) => ({ ...prev, [member.user.id]: Number(e.target.value) || 0 }))
                        }
                        className="w-20 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tabular-nums"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {splitMode === "exact" && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Exact amounts</Label>
                  <span className="text-sm font-mono tabular-nums text-muted-foreground">
                    {formatMoney(totalExact)} / {formatMoney(totalAmount)}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedMemberObjects.map((member) => (
                    <div key={member.user.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.imageUrl ?? undefined} alt={member.user.name} />
                        <AvatarFallback>{member.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="w-28 font-medium truncate">{member.user.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={(exactAmounts[member.user.id] ?? 0) / 100}
                          onChange={(e) =>
                            setExactAmounts((prev) => ({
                              ...prev,
                              [member.user.id]: Math.round(Number(e.target.value) * 100) || 0,
                            }))
                          }
                          className="w-24 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {totalExact > totalAmount && (
                  <p className="text-sm text-rose-500">Total exceeds expense amount</p>
                )}
                {totalExact < totalAmount && (
                  <p className="text-sm text-amber-500">{formatMoney(totalAmount - totalExact)} left to assign</p>
                )}
              </div>
            )}

            {splitMode === "equal" && memberCount > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground font-mono tabular-nums">
                  Each person pays: {formatMoney(equalShare)}
                  {remainder > 0 && <span className="font-normal"> (first {remainder} pay 1¢ more)</span>}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending} className="ml-auto">
              {isPending ? (editingExpense ? "Saving..." : "Adding...") : editingExpense ? "Save changes" : "Add expense"}
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
  editingExpense: GroupView["expenses"][0] | null;
  onSaved: () => void;
}