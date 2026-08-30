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
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        !settled &&
          !owedToYou &&
          "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
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
