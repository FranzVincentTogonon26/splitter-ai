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
- `Expense.amountCents` is always USD, converted server-side at entry.
  Editing an expense is a re-entry: it re-validates everything and
  re-converts at today's rate. Stored expenses are never re-converted
  otherwise; only display uses today's rate.
- Add and edit share one form and one validation path. Edit is never a
  partial-field update: the server re-runs the full expense validation and
  rewrites the splits atomically with the total (nested `deleteMany` +
  `create` in a single update).
- Balances and simplified debts are **derived at read time, never stored**.
  There is no Debt table.
- Derived numbers must be **auditable from the screen**: every record that
  feeds the balance math (expenses AND settlements) is visible in the group
  Activity list and individually deletable there. Deleting an expense never
  cascades to settlements — a recorded payment is its own fact and stays
  until removed explicitly.
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
- After upgrading `next`, STOP the dev server and delete `.next` before
  restarting. Stale Turbopack chunks from the old version load the wrong
  vendored React and crash with misleading errors ("React.unstable_postpone
  is not defined" — surfaced through whatever library touches React first,
  e.g. a Clerk "only supported in App Router" message).
- Clerk **Keyless mode is a temporary bridge**: unclaimed keyless instances
  expire, and clerk-js then fails in the browser with a generic "Something
  went wrong initializing Clerk". Before recording or demoing, run
  `clerk doctor` and require all green — authenticated, linked, and real
  keys in `.env.local` (`clerk env pull`). Claim the keyless instance (URL
  in `.clerk/.tmp/keyless.json`) to keep its users; `clerk init` starts a
  fresh instance whose userIds won't match existing DB rows.
- When swapping tweakcn themes, re-wire the theme's font names to
  `next/font` variables in the `@theme inline` block — registry CSS only
  names fonts, it doesn't load them.
- Clerk v7 removed the `SignedIn` / `SignedOut` control components (the
  pre-v7 API most models still generate). Use `<Show when="signed-in">` /
  `<Show when="signed-out">` from `@clerk/nextjs` instead. Symptom of the
  old API: "Export SignedIn doesn't exist in target module".
- Clerk deprecation warning "createRouteMatcher is deprecated" in
  `proxy.ts` is expected and non-fatal — Clerk is moving to resource-based
  auth checks (auth verified in each page/action, which this app already
  does). Migrate proxy.ts when the next major forces it, not before.
