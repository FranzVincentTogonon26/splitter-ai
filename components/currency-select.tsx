"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/utils";

/**
 * The display-currency switcher. Selecting a currency updates the `?currency=`
 * URL param, which the server components read to convert balances, debts,
 * totals, and shares at today's rate (USD is always available; other codes
 * need live frankfurter.dev rates).
 */
export function CurrencySelect({
  defaultValue = "USD",
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("currency") ?? defaultValue;

  const onChange = (code: string | null) => {
    const next = code ?? "USD";
    const params = new URLSearchParams(searchParams.toString());
    if (next === "USD") {
      params.delete("currency");
    } else {
      params.set("currency", next);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "w-auto gap-1 border-none bg-transparent px-2 shadow-none text-base font-semibold focus:ring-0 focus:ring-offset-0",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border border-border">
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="font-semibold">{c.code}</span>
            <span className="text-muted-foreground"> — {c.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
