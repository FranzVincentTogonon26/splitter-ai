# Build Plan

One phase = one commit (or a tight commit series). Check items off as they
land. Detail lives here so the agent builds the _specified_ thing, not an
approximation.

---

## 01 Agent-Native Infrastructure

- [x] Provision Clerk app + keys with the Clerk CLI (`clerk init --framework
next`; `clerk env pull` for refreshes; verify with `clerk doctor`)
- [x] `proxy.ts` with `clerkMiddleware()` protecting `/dashboard` and
      `/groups/*`; `/`, auth pages, and webhooks stay public
- [x] Root layout wrapped in `<ClerkProvider>`; header with logo, Dashboard
      link + `<UserButton />` (signed in), Sign in / Get started modals
      (signed out)
- [x] `/sign-in` and `/sign-up` catch-all routes
- [x] Keyless mode works before real keys exist

## 02 UI Foundation (mock data)

- [x] Dashboard: welcome line, owed/owe tiles, group cards
- [x] Group view: expenses list, who-owes-whom sidebar, members
- [x] Add-expense modal shell against the typed mock data in `lib/`
- [x] View-model types mirror the future Prisma models so the swap is drop-in

## 02b Visual Reference (screenshots)

The phase-2 UI won't match the intended design from words alone. Fix it
with pictures, not longer prompts:

- [x] Drop screenshots of the target design into `.context/screenshots/`
      (see its README for the expected files)
- [x] Prompt the agent to make each page match its screenshot — layout,
      spacing, hierarchy from the image; colors from theme tokens only
- [x] Keep the screenshots in the repo: they're part of the spec now, and
      every later phase checks against them

## 03 Database & Server Actions

- [x] Prisma schema per `3-database-schema.md` (User id = Clerk userId;
      integer cents; splits + settlements)
- [x] Server actions: createGroup (creator = admin, redirect into group),
      addMember (by email, must have an account), addExpense, settleUp
- [x] Every action: `await auth()` first, membership verified, revalidate
- [x] `lib/ensure-user.ts` upserts the signed-in user as dev fallback
- [x] Mock data deleted; pages query through `lib/queries.ts`

## 04 Debt Simplification

- [x] `lib/balances.ts`: net balance per member from expenses ± settlements
- [x] `lib/simplify-debts.ts`: greedy largest-debtor ↔ largest-creditor
      matching; any group settles in ≤ n−1 payments; fuzz-tested
- [x] Group page shows the minimized list, not the raw pairwise ledger

## 05 Webhook User Sync

- [x] `app/api/webhooks/clerk/route.ts` with `verifyWebhook`
- [x] Idempotent upserts for user.created/updated; deleteMany for deleted
- [ ] Register the endpoint + `CLERK_WEBHOOK_SIGNING_SECRET` in production
      (dev secret placeholder in `.env.local`; run `clerk auth login`, then
      register the endpoint and swap in the real signing secret —
      `scripts/verify-webhook-e2e.mjs` proves the route locally)

## 06 Flexible Splits

- [x] Splitwise sentence: "Paid by [member] and split [equally | by
      percentages | by exact amounts]" as inline pill selects
- [x] Member include/exclude checkboxes with avatars
- [x] Per-mode inputs: live share preview (equal), % inputs summing to 100
      with running hint, exact amounts with left-to-assign hint
- [x] Save disabled until the math reconciles; server re-validates
      (members only, no dupes, positive, sums exactly) — `lib/splits.ts` is
      the shared validation path `addExpense` and (phase 12) `updateExpense`
      will both use; splits always sum exactly via largest-remainder math

## 07 Multi-Currency

- [x] Expense entry in 20 ECB currencies; server converts once to USD at
      save (frankfurter.dev, 1h cache); original amount + currency stored
- [x] Splits converted proportionally with exact-sum reconciliation
      (largest-remainder, fuzz-verified in lib/fx.test.ts)
- [x] Display-currency switcher (`?currency=`) on dashboard + group page;
      converts balances, debts, totals, shares at today's rate (degrades
      to USD with a notice when rates are unavailable)
- [x] Expense rows show original amount + display-currency equivalent

## 08 AI Quick-Add

- [x] ✨ box in the expense modal: free text → `claude-sonnet-4-5` via
      `messages.parse` + `zodOutputFormat` → {description, amount, currency}
- [x] Currency constrained to the supported enum; AI never does money math
      (lib/ai.ts validates + rounds to cents deterministically)
- [x] Graceful degradation without `ANTHROPIC_API_KEY` (and on any model or
      network failure): friendly error, manual entry untouched

## 09 Design System & Theming

- [x] shadcn/ui migration (base-nova / Base UI): buttons, cards, dialog,
      selects, checkbox, badges, avatars, sonner (Radix removed from
      package.json entirely; selects render labels via `items` maps)
- [x] Clerk modals themed via `@clerk/ui` shadcn theme (ClerkProvider
      appearance)
- [x] tweakcn theme applied; fonts loaded via `next/font` and wired into
      `@theme inline` (full token set: popover, destructive, input, ring,
      chart, radius scale)
- [x] 💸 favicon (`app/icon.svg`)

## 10 Landing Page

- [x] Built `app/page.tsx` per the `landing-page-design` skill (hero,
      proof card, features, how-it-works, final CTA — all theme tokens)
- [x] Hero + proof card (5 IOUs → 2 payments, real math, real components)
- [x] Feature cards, 3-step how-it-works, final CTA; auth-aware CTAs
      (`Show` + `SignUpButton mode="modal"` → `/dashboard` when signed in)
- [x] Fun pass: floating currency glyphs, tilt-to-straighten + hover lift
      micro-motion, `tw-animate-css` entrance fades (CSS-only, no client
      JS for decoration), one microcopy wink ("No spreadsheets were harmed")

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
