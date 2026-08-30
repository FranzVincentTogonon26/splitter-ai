import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BalancePill({
  cents,
  className,
}: {
  cents: number;
  className?: string;
}) {
  const settled = cents === 0;
  const owedToYou = cents > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap",
        settled &&
          "border-transparent bg-secondary text-secondary-foreground",
        owedToYou &&
          "border-emerald-500/50 bg-background text-emerald-600",
        !settled && !owedToYou &&
          "border-rose-500/50 bg-background text-rose-600",
        className,
      )}
    >
      {settled
        ? "settled up"
        : owedToYou
          ? `you are owed ${formatMoney(cents)}`
          : `you owe ${formatMoney(-cents)}`}
    </span>
  );
}
