# Build Plan

One phase = one commit (or a tight commit series). Check items off as they
land. Detail lives here so the agent builds the _specified_ thing, not an
approximation.

---

## 01 Agent-Native Infrastructure

- [ ] Provision Clerk app + keys with the Clerk CLI (`clerk init --framework
next`; `clerk env pull` for refreshes; verify with `clerk doctor`)
- [ ] `proxy.ts` with `clerkMiddleware()` protecting `/dashboard` and
      `/groups/*`; `/`, auth pages, and webhooks stay public
- [ ] Root layout wrapped in `<ClerkProvider>`; header with logo, Dashboard
      link + `<UserButton />` (signed in), Sign in / Get started modals
      (signed out)
- [ ] `/sign-in` and `/sign-up` catch-all routes
- [ ] Keyless mode works before real keys exist

## 02 UI Foundation (mock data)

- [ ] Dashboard: welcome line, owed/owe tiles, group cards
- [ ] Group view: expenses list, who-owes-whom sidebar, members
- [ ] Add-expense modal shell against the typed mock data in `lib/`
- [ ] View-model types mirror the future Prisma models so the swap is drop-in

## 02b Visual Reference (screenshots)

The phase-2 UI won't match the intended design from words alone. Fix it
with pictures, not longer prompts:

- [ ] Drop screenshots of the target design into `.context/screenshots/`
      (see its README for the expected files)
- [ ] Prompt the agent to make each page match its screenshot — layout,
      spacing, hierarchy from the image; colors from theme tokens only
- [ ] Keep the screenshots in the repo: they're part of the spec now, and
      every later phase checks against them

## 03 Database & Server Actions

- [ ] Prisma schema per `3-database-schema.md` (User id = Clerk userId;
      integer cents; splits + settlements)
- [ ] Server actions: createGroup (creator = admin, redirect into group),
      addMember (by email, must have an account), addExpense, settleUp
- [ ] Every action: `await auth()` first, membership verified, revalidate
- [ ] `lib/ensure-user.ts` upserts the signed-in user as dev fallback
- [ ] Mock data deleted; pages query through `lib/queries.ts`

## 04 Debt Simplification

- [ ] `lib/balances.ts`: net balance per member from expenses ± settlements
- [ ] `lib/simplify-debts.ts`: greedy largest-debtor ↔ largest-creditor
      matching; any group settles in ≤ n−1 payments; fuzz-tested
- [ ] Group page shows the minimized list, not the raw pairwise ledger

## 05 Webhook User Sync

- [ ] `app/api/webhooks/clerk/route.ts` with `verifyWebhook`
- [ ] Idempotent upserts for user.created/updated; deleteMany for deleted
- [ ] Register the endpoint + `CLERK_WEBHOOK_SIGNING_SECRET` in production

## 06 Flexible Splits

- [ ] Splitwise sentence: "Paid by [member] and split [equally | by
      percentages | by exact amounts]" as inline pill selects
- [ ] Member include/exclude checkboxes with avatars
- [ ] Per-mode inputs: live share preview (equal), % inputs summing to 100
      with running hint, exact amounts with left-to-assign hint
- [ ] Save disabled until the math reconciles; server re-validates
      (members only, no dupes, positive, sums exactly)

## 07 Multi-Currency

- [ ] Expense entry in 20 ECB currencies; server converts once to USD at
      save (frankfurter.dev, 1h cache); original amount + currency stored
- [ ] Splits converted proportionally with exact-sum reconciliation
- [ ] Display-currency switcher (`?currency=`) on dashboard + group page;
      converts balances, debts, totals, shares at today's rate
- [ ] Expense rows show original amount + display-currency equivalent

## 08 AI Quick-Add

- [ ] ✨ box in the expense modal: free text → `claude-sonnet-4-5` via
      `messages.parse` + `zodOutputFormat` → {description, amount, currency}
- [ ] Currency constrained to the supported enum; AI never does money math
- [ ] Graceful degradation without `ANTHROPIC_API_KEY`

## 09 Design System & Theming

- [ ] shadcn/ui migration (base-nova / Base UI): buttons, cards, dialog,
      selects, checkbox, badges, avatars, sonner
- [ ] Clerk modals themed via `@clerk/ui` shadcn theme
- [ ] tweakcn theme applied; fonts loaded via `next/font` and wired into
      `@theme inline`
- [ ] 💸 favicon (`app/icon.svg`)

## 10 Landing Page

- [ ] Build `app/page.tsx` from the `landing-page-design` skill
- [ ] Hero + proof card (5 IOUs → 2 payments, real math, real components)
- [ ] Feature cards, 3-step how-it-works, final CTA; auth-aware CTAs
- [ ] Fun pass: floating currency glyphs, tilt/hover micro-motion,
      entrance fades, one microcopy wink

## 11 Feedback & List Actions

- [ ] Every action button: pending label + sonner toast (rule encoded in
      Invariants + nextjs-review skill)
- [ ] Explicit `type="submit"` on form buttons (Base UI defaults to
      `type="button"`)
- [ ] Selects render names via `items` map — never raw Clerk userIds
- [ ] Delete expense: trash icon per row → spinner → toast; group-scoped
- [ ] Sparkle indicator on expenses added in the last minute
- [ ] Settle up available to either party of a debt

## 12 Edit Expense

- [ ] Pencil icon per expense row opens the same modal as Add, pre-filled —
      ONE component (`components/expense-modal.tsx`), an `expense` prop
      switches add/edit; no separate edit form
- [ ] Pre-fill reconstructs entered-currency shares from stored USD splits
      via the same proportional exact-sum math (`convertSplits` in reverse);
      equal-ish splits reopen in "equally" mode, others as exact amounts
- [ ] `updateExpense` runs the identical validation + conversion as
      `addExpense` (shared helper) — an edit is a re-entry, re-converted at
      today's rate
- [ ] Splits rewritten wholesale in one nested update (`deleteMany` +
      `create`) so total and shares can't drift; update scoped by `groupId`
- [ ] Form state populated on OPEN (not reset on close) so a reopen after
      save shows the saved values

## 13 Ledger Visibility

Motivation: edit/delete an expense after a settle-up and "Who owes whom"
looks wrong, because the recorded payment silently stays in the math but
is shown nowhere.

- [ ] "Expenses" section becomes **Activity**: expenses AND settlements
      interleaved, newest first (payment rows: HandCoins icon, "X paid Y",
      amount, date)
- [ ] Settlements deletable like expenses (`deleteSettlement`,
      group-scoped) — a bad settle-up can be removed in the UI
- [ ] Delete button generalized to `DeleteRowButton`: takes a **bound
      server action** (`deleteExpense.bind(null, groupId, id)`) as a prop, so
      one client component serves every deletable row type
- [ ] Invariant: every record that feeds a derived number is visible and
      removable on screen — balances must be auditable from the UI

## 14 Stretch Goals

- [ ] Per-group base currency (`Group.baseCurrency`) instead of global USD
- [ ] Dark-mode toggle (`next-themes`)
- [ ] Undo-in-toast (or confirm) for expense delete
- [ ] Store FX rate/date on each expense for explicit auditability
- [ ] Production deploy: Postgres provider swap, `clerk env pull --instance
prod`, webhook registration
