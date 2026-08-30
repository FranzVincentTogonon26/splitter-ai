"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Display currencies (entry currencies live in the expense modal, phase 07
// expands both to the full 20-currency ECB list).
const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
];

export function CurrencySelect({
  defaultValue = "USD",
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger
        className={cn(
          "w-auto gap-1 border-none bg-transparent px-2 shadow-none text-base font-semibold focus:ring-0 focus:ring-offset-0",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
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
