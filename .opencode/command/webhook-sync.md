---
description: Phase 5 — sync Clerk users into Prisma via verified webhooks
---

Execute the webhook sync steps exactly as written below. Stop what you are
doing and work through them in order.

## /webhook-sync (Phase 5 — user sync)

1. Write `app/api/webhooks/clerk/route.ts` using `verifyWebhook` from
   `@clerk/nextjs/webhooks` (NOT hand-rolled svix verification).
2. Handle `user.created`, `user.updated`, `user.deleted` with idempotent
   upserts/deletes into the Prisma `User` table.
3. Tell me to expose localhost with a tunnel and register the endpoint
   with `clerk api` (or the Dashboard), then set
   `CLERK_WEBHOOK_SIGNING_SECRET` in `.env.local`.
