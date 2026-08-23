---
description: Phase 1 — provision Clerk auth infrastructure via the clerk CLI
---

Execute the Clerk setup steps exactly as written below. Stop what you are doing
and work through them in order.

## /clerk-setup (Phase 1 — infrastructure)

1. Tell me to run `clerk init --framework next` in my terminal. This one
   command creates the Clerk application, links the project, installs
   `@clerk/nextjs`, and writes the keys into `.env.local`.
2. If keys are ever missing later, tell me to run `clerk env pull`.
   Keyless mode (no keys in `.env.local`) is only a temporary bridge —
   unclaimed keyless instances expire and break sign-in at runtime. Flag
   it if the project is still keyless, and gate demos on `clerk doctor`
   passing.
3. Scaffold `proxy.ts` with `clerkMiddleware()` protecting `/dashboard`
   and `/groups`, wrap the root layout in `<ClerkProvider>`, and add
   sign-in / sign-up pages. Auth-conditional UI uses Clerk v7's
   `<Show when="signed-in">` / `<Show when="signed-out">` — the
   `SignedIn` / `SignedOut` components from your training data were
   removed in v7.
4. Finish by telling me to run `clerk doctor` to verify the integration.
   