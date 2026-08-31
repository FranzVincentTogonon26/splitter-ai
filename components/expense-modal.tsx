"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { addExpense } from "@/app/actions/expenses";
import { parseExpenseText } from "@/app/actions/ai";
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
import { CURRENCIES } from "@/lib/currencies";
import { formatMoney } from "@/lib/format";
import { equalSplits, type SplitMode } from "@/lib/splits";
import type { GroupView } from "@/lib/types";

const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "equally" },
  { value: "percentage", label: "by percentages" },
  { value: "exact", label: "by exact amounts" },
];

/** Clamp raw keystrokes into a valid percentage value (0–100, 2 decimals). */
function clampPercent(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, Math.round(n * 100) / 100);
}

/**
 * Prefill percentages from equal shares, quantized to 0.01% so the values sum
 * to exactly 100.00 (naive rounding can drift to 99.99). Largest-remainder
 * over 10000 units of 0.01%, ties broken by member order — mirrors the
 * server's percentageSplits.
 */
function prefillPercentages(
  amountCents: number,
  ids: readonly string[],
  shares: readonly number[],
): Record<string, number> {
  const weights =
    amountCents > 0 ? shares.map((s) => s / amountCents) : ids.map(() => 1 / ids.length);
  const units = weights.map((w) => Math.floor(w * 10_000));
  let leftover = 10_000 - units.reduce((a, b) => a + b, 0);
  const byRemainder = weights
    .map((_, i) => i)
    .sort((a, b) => (weights[b] * 10_000) % 1 - (weights[a] * 10_000) % 1);
  for (let k = 0; leftover > 0; k++, leftover--) {
    units[byRemainder[k % byRemainder.length]] += 1;
  }
  return Object.fromEntries(ids.map((id, i) => [id, units[i] / 100]));
}

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
  const [exactAmounts, setExactAmounts] = React.useState<
    Record<string, number>
  >({});
  const [aiText, setAiText] = React.useState("");
  const [aiPending, startAiTransition] = React.useTransition();
  const [aiError, setAiError] = React.useState("");

  // Selects render labels through an items map — never raw userIds.
  const payerItems = Object.fromEntries(
    members.map((m) => [
      m.user.id,
      m.user.id === currentUserId ? `${m.user.name} (You)` : m.user.name,
    ]),
  );
  const modeItems = Object.fromEntries(
    SPLIT_MODES.map((m) => [m.value as string, m.label]),
  );

  // The AI fills the same fields manual entry uses — one validation path.
  const handleAiParse = () => {
    setAiError("");
    startAiTransition(async () => {
      const result = await parseExpenseText(aiText);
      if (result.ok) {
        setDescription(result.description);
        setAmount(result.amount);
        setCurrency(result.currency);
        // Stale percentage/exact prefills no longer match the new amount —
        // reset to equal splits, which is always valid for any total.
        setSplitMode("equal");
        setPercentages({});
        setExactAmounts({});
        setAiText("");
      } else {
        setAiError(result.error);
      }
    });
  };

  const [state, formAction] = React.useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await addExpense(groupId, { error: "" }, formData);
      if (result.ok) {
        toast.success("Expense added");
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    { error: "" },
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("description", description);
    formData.set("amount", amount);
    formData.set("paidBy", paidBy);
    formData.set("splitMode", splitMode);
    // The entry currency — addExpense converts once to USD at save time.
    formData.set("currency", currency);
    // Display order: leftover cents land on the first rows in the list.
    selectedMemberObjects.forEach((m) => {
      formData.append("members", m.user.id);
      formData.set(`percentage-${m.user.id}`, String(percentages[m.user.id] ?? 0));
      formData.set(
        `exact-${m.user.id}`,
        String(exactAmounts[m.user.id] ?? 0),
      );
    });
    startTransition(() => {
      formAction(formData);
    });
  };

  React.useEffect(() => {
    if (
      typeof state === "object" &&
      state !== null &&
      "ok" in state &&
      state.ok
    ) {
      onSaved();
    }
  }, [state, onSaved]);

  if (!isOpen) return null;

  const totalAmount = Math.round(Number(amount) * 100);
  const selectedMemberObjects = members.filter((m) =>
    selectedMembers.includes(m.user.id),
  );
  const memberCount = selectedMemberObjects.length;

  // Live preview mirrors the server exactly: only SELECTED members count.
  const equalShare =
    memberCount > 0 ? Math.floor(totalAmount / memberCount) : 0;
  const remainder =
    memberCount > 0 ? totalAmount - equalShare * memberCount : 0;

  const selectedPercentages = selectedMemberObjects.map(
    (m) => percentages[m.user.id] ?? 0,
  );
  const totalPercentage = selectedPercentages.reduce((a, b) => a + b, 0);
  const selectedExact = selectedMemberObjects.map(
    (m) => exactAmounts[m.user.id] ?? 0,
  );
  const totalExact = selectedExact.reduce((a, b) => a + b, 0);

  const percentagesValid =
    Math.abs(totalPercentage - 100) <= 1e-9 &&
    selectedPercentages.every((p) => p >= 0 && p <= 100);

  const exactsValid =
    totalExact === totalAmount && selectedExact.every((a) => a >= 0);

  const canSubmit =
    Boolean(description.trim()) &&
    totalAmount > 0 &&
    memberCount > 0 &&
    (splitMode === "equal" ||
      (splitMode === "percentage" && percentagesValid) ||
      (splitMode === "exact" && exactsValid));

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAiParse();
                    }
                  }}
                  placeholder={'e.g. "dinner in Tokyo 4500 yen"'}
                  className="border-2 border-primary/50 bg-background focus-visible:ring-primary/20"
                />
                <Button
                  type="button"
                  className="border-0 bg-muted text-muted-foreground hover:bg-muted/70"
                  disabled={aiPending || !aiText.trim()}
                  onClick={handleAiParse}
                >
                  {aiPending ? "Reading…" : "Parse"}
                </Button>
              </div>
              {aiError && (
                <p className="text-sm text-rose-500">{aiError}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="description" className="text-base font-semibold">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner at the beach shack"
              required
              className="font-normal border-border p-2  bg-transparent placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
          </div>

          <div className="space-y-4">
            <Label htmlFor="amount" className="text-base font-semibold">
              Amount
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="flex-1  border-border p-2 bg-transparent  focus:outline-none focus:ring-0"
              />
              <Select
                value={currency}
                onValueChange={(v) => {
                  if (v !== null) setCurrency(v);
                }}
              >
                <SelectTrigger className="w-24 gap-1 border-border bg-transparent px-1 shadow-none font-semibold focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-border">
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
            <Select
              value={paidBy}
              onValueChange={(v) => {
                if (v !== null) setPaidBy(v);
              }}
              items={payerItems}
            >
              <SelectTrigger className="w-auto gap-1 border-none bg-transparent px-1 shadow-none text-base font-semibold text-primary focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-border">
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
              onValueChange={(v) => {
                if (v === null) return;
                const mode = v as SplitMode;
                setSplitMode(mode);
                // Splitwise-style: prefill from the current equal shares so
                // the math always starts reconciled.
                const ids = selectedMemberObjects.map((m) => m.user.id);
                const shares = equalSplits(totalAmount, ids);
                if (mode === "percentage") {
                  setPercentages(prefillPercentages(totalAmount, ids, shares.map((s) => s.amountCents)));
                } else if (mode === "exact") {
                  setExactAmounts(
                    Object.fromEntries(
                      ids.map((id, i) => [id, shares[i].amountCents]),
                    ),
                  );
                }
              }}
              items={modeItems}
            >
              <SelectTrigger className="w-auto gap-1 border-none bg-transparent px-1 shadow-none text-base font-semibold text-primary focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-border">
                {SPLIT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </p>

          <div className="rounded-xl border border-border divide-y">
            {members.map((member) => (
              <label
                key={member.user.id}
                className="flex items-center border-border gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors"
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
                <Avatar className="h-9 w-9">
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
                      : totalPercentage < 100
                        ? "text-amber-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {Math.round(totalPercentage * 100) / 100}% of 100%
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
                    step="0.01"
                    value={percentages[member.user.id] ?? 0}
                    onChange={(e) =>
                      setPercentages((prev) => ({
                        ...prev,
                        [member.user.id]: clampPercent(e.target.value),
                      }))
                    }
                    className="w-20 h-10 rounded-md border border-input bg-background px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tabular-nums"
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="text-muted-foreground text-sm font-mono tabular-nums">
                    {formatMoney(
                      Math.round(
                        (totalAmount * (percentages[member.user.id] ?? 0)) /
                          100,
                      ),
                    )}
                  </span>
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
                          [member.user.id]: Math.max(
                            0,
                            Math.round(Number(e.target.value) * 100) || 0,
                          ),
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

          <DialogFooter className="mt-6 -mx-6 -mb-6 rounded-b-lg bg-muted px-6 py-4">
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
