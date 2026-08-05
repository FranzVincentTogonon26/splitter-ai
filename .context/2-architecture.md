# Architecture & Stack

- **Framework:** Next.js 16, App Router only. No `pages/` directory.
  Next 16 uses `proxy.ts` (NOT `middleware.ts`) for request interception.
- **Styling:** Tailwind CSS v4 + **shadcn/ui** (base-nova style, Base UI
  primitives) from `components/ui/` via `npx shadcn add <component>`.
  Theme: custom tweakcn theme (coral primary, teal secondary/accent,
  Poppins / JetBrains Mono loaded via `next/font`).
- **Clerk appearance:** Clerk components use the shadcn theme from
  `@clerk/ui/themes` so modals match the design system.
- **Database:** Prisma ORM. SQLite locally (zero-setup for dev); switching
  to Postgres/Neon in production is a one-line provider change in
  `prisma/schema.prisma`.
- **Currencies:** entry in any supported currency, converted once to USD
  at save time (ECB rates, cached 1h); display converts on demand via
  `?currency=`. Original currency + amount stored alongside.
- **Authentication:** Clerk (`@clerk/nextjs`). Server code imports from
  `@clerk/nextjs/server`; client code from `@clerk/nextjs`.
- **AI:** Anthropic SDK, model `claude-sonnet-4-5`, structured outputs via
  `client.messages.parse` + `zodOutputFormat`. Requires `ANTHROPIC_API_KEY`;
  every AI action degrades gracefully without it.

## Invariants

Rules the AI agent must never violate:

- Every server action starts with `const { userId } = await auth()` and
  rejects unauthenticated calls. Identity comes from Clerk only — never
  trust a userId passed from the client.
- Every mutation verifies **group membership** before touching rows, and
  every query/delete is scoped by `groupId` — no cross-group access by
  guessing ids.
- All database mutations go through Server Actions in `app/actions/`.
  The ONLY API route is the Clerk webhook, which is public but always
  verified with `verifyWebhook` and handled idempotently.
- Reads never live in `"use server"` files — queries belong in `lib/`
  (everything exported from an actions file becomes a public endpoint).
- UI components never query the database. Pages (server components) fetch
  via `lib/` helpers and pass data down as props.
- Money is **integer cents**, never floats. Splits must sum exactly to
  their expense total — the server validates; client rounding is never
  trusted.
- `Expense.amountCents` is always USD, converted exactly once, server-side,
  at entry. Stored expenses are never re-converted; only display uses
  today's rate.
- Balances and simplified debts are **derived at read time, never stored**.
  There is no Debt table.
- `User.id` IS the Clerk userId. No internal id mapping. Raw userIds never
  appear in the UI — render names (Base UI selects need an `items` map).
- AI does language understanding only; money math and FX conversion stay
  deterministic in server code. AI failures degrade to manual entry.
- Secrets (`CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, webhook secret) stay
  server-side — never `NEXT_PUBLIC_`, never passed to client components.
- No hardcoded hex values or raw palette classes in components — theme
  tokens from `app/globals.css` only. Exception: emerald = money owed,
  rose = money owed by you; used for money and nothing else.
- Every mutation revalidates the paths it changed (`revalidatePath`).
- Every action button shows a pending state (`useTransition`) and reports
  its outcome with a sonner toast. Buttons that submit forms carry an
  explicit `type="submit"`.
- UI copy stays minimal: validation messages only, no explainer text.

## Conventions & Gotchas

- `auth()` is async in Next.js 15+: always `await auth()`.
- Base UI uses the `render` prop, NOT Radix's `asChild`; pass
  `nativeButton={false}` when the rendered element isn't a `<button>`.
  Base UI Button defaults to `type="button"` (see invariant above).
- After any `prisma migrate dev` / `prisma generate`, RESTART the dev
  server — `lib/db.ts` caches the PrismaClient on `globalThis`, so a
  running server keeps the old client and new columns read back
  `undefined`.
- When swapping tweakcn themes, re-wire the theme's font names to
  `next/font` variables in the `@theme inline` block — registry CSS only
  names fonts, it doesn't load them.
