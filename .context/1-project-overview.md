# Project Overview: Splitter

## About the Project

A full-stack Splitwise clone. Users authenticate with Clerk, create groups,
add shared expenses in any currency, and the system automatically minimizes
who owes whom ("simplify debts"). The ledger lives in USD; any currency is
accepted at entry and any currency can be chosen for display.

## Navigation

- Header on every page: 💸 Splitter logo → `/`
- Signed in → "Dashboard" link + Clerk `<UserButton />`
- Signed out → "Sign in" (ghost) + "Get started" (primary), both open
  Clerk modals
- Route protection lives in `proxy.ts`: `/dashboard` and `/groups/*` are
  protected; `/`, auth pages, and `/api/webhooks/*` are public

## Core User Flow

### Landing page (`/`)

- Hero with one-line pitch and a single CTA
- Proof card: 5 raw IOUs collapsing to 2 payments (the algorithm is the pitch)
- Feature cards, 3-step how-it-works, final CTA
- Signed out → CTA opens the sign-up modal; signed in → CTA links to
  `/dashboard`. No redirects — the landing page is always viewable.

### Auth

- Clerk modals from the header/CTAs, plus dedicated `/sign-in` and
  `/sign-up` catch-all routes
- After auth, users land on `/dashboard` (fallback redirect URLs in env)
- `lib/ensure-user.ts` upserts the Clerk user into our `User` table on
  dashboard load; the webhook (`/api/webhooks/clerk`) is the production
  sync path for created/updated/deleted users

### Dashboard (`/dashboard`)

- Welcome line with the user's first name
- Two tiles: total you are owed / total you owe (across all groups)
- Display-currency select (`?currency=`) converts every amount shown
- Group cards: name, your balance pill, member avatars, group total;
  click-through carries the display currency
- "Create group" form inline → creates group (creator = admin) and
  redirects into it

### Group page (`/groups/[groupId]`)

- Header: group name, member avatars, your balance pill
- Display-currency select + "Add expense" button
- **Expense modal (one component serves add AND edit):**
  - ✨ AI quick-add: free text ("dinner in Tokyo 4500 yen") → Claude fills
    description, amount, currency
  - Description, amount + currency select (20 ECB currencies)
  - Sentence: "Paid by [member] and split [equally | by percentages |
    by exact amounts]"
  - Member checkboxes to include/exclude; per-mode inputs must reconcile
    exactly before Save enables
  - Edit (pencil icon per row) opens the same modal pre-filled in the
    entered currency; saving re-validates and re-converts like a new entry
- **Activity list:** every ledger record, newest first —
  - Expense rows: description (sparkle icon if added <1 min ago), who
    paid, original amount (+ display-currency equivalent), date, your
    share, pencil + trash icons
  - Payment rows (settle-ups): who paid whom, amount, date, trash icon —
    payments are shown and deletable so balances stay auditable
- **Who owes whom:** simplified debts (≤ n−1 payments); each debt
  involving you has a "Settle up" button — either party can record it
- **Members:** list with avatars/emails + add-member-by-email form
  (member must already have a Splitter account)

### Money rules (summary — details in 2-architecture.md)

- Entry in any supported currency, converted once to USD at save time
  (ECB rate); stored splits always sum exactly to the stored total
- Balances and simplified debts are derived at read time, never stored
- Settlements are recorded in USD between the two debt parties

## Product Requirements (agreed in review)

- **Every action button gives feedback:** pending label while the server
  action runs + sonner toast for the outcome (see 2-architecture rules 6–7)
- **Minimal UI copy:** no explanatory/educational notes in the interface;
  helper text is limited to actionable validation ("Percentages add up to
  87%"). Design rationale lives in these docs, not in product copy.
- **Rates lock at entry:** a saved expense's USD value never drifts with
  FX moves; only the *display* conversion uses today's rate
- **Names, never ids:** raw Clerk userIds must never appear in the UI
  (Base UI selects need an `items` map to render labels)
- **New-item feedback:** a freshly added expense is visibly marked in the
  list (sparkle, first minute)

## Discussed, Not Built (candidate roadmap)

- Per-group base currency (`Group.baseCurrency`) instead of global USD
- Dark-mode toggle (`next-themes`) — themes already define `.dark` palettes
- Delete confirmation or undo-in-toast for destructive actions
  (currently one-click delete by design)
- Storing the FX rate/date on each expense for explicit auditability
  (currently derivable from `amountCents / originalAmountCents`)

## Out of Scope

- NO custom auth, sessions, or password flows — Clerk owns all of it
  (provisioned via the `clerk` CLI)
- NO real money movement — Splitter records that a payment happened;
  it is not a payments processor
- NO receipts/OCR, recurring expenses, or push notifications (yet)

## Visual Reference

`.context/screenshots/` holds screenshots of the finished app. Before
building or changing any page, open the matching screenshot and match its
layout, spacing, and hierarchy. Colors come from the theme tokens, never
sampled from the image.
