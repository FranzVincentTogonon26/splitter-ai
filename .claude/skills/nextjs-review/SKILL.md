---
name: nextjs-review
description: Next.js App Router best-practices checklist (33 common mistakes).
  Use when writing or reviewing Next.js code — pages, layouts, server
  components, client components, server actions, caching, metadata, images,
  or fonts. Also use before committing any PR that touches app/ or lib/.
---

# Next.js Review Checklist

Apply this checklist when writing or reviewing Next.js code in this project.
Flag violations with the item number. Project context: Next.js 16 App Router,
`proxy.ts` (not middleware), Server Actions in `app/actions/`, Clerk auth.

## Server vs Client Components

1. **Never mark a root page/layout `"use client"`.** It drags the whole tree
   to the client. Only interactive *leaf* components get `"use client"`
   (forms, dialogs, buttons with handlers).
2. **No `window`/`document`/event handlers in server components.** Extract
   browser-dependent code into a dedicated client component.
3. **Don't add `"use client"` "just in case".** A form posting to a server
   action doesn't need it. Add it only for state, effects, handlers, or
   browser APIs.
4. **Don't force truly interactive UI into server components** (drag-drop,
   animations, live counters). Constant round-trips = lag. Client components
   are the right tool there.
5. **Context providers:** wrap `{children}` in a small `"use client"`
   provider component; never mark the layout itself as client.

## Server Actions & Data

6. **Every server action is a public HTTP endpoint — protect it.** First
   line: `const { userId } = await auth()`; reject if missing; validate all
   inputs; check row-level access (this repo: verify group membership).
7. **No `get`/read functions in `"use server"` files.** Everything exported
   from those files becomes an endpoint. Reads live in `lib/queries.ts`;
   only mutations live in `app/actions/`.
8. **No GET API routes for data a server component can fetch itself.**
   `async` server component + Suspense beats `/api/...` + useState.
9. **No mutations inside server components.** Fetch in components, mutate in
   server actions. After mutating: revalidate.
10. **Always revalidate after mutations:** `revalidatePath()` /
    `revalidateTag()` in the action, or the UI shows stale data.
11. **Never call `redirect()` inside try/catch** — it works by throwing. If
    unavoidable, rethrow in the catch block.
12. **`redirect()` (server) vs `router.push()` (client):** server-side
    redirect when no client follow-up is needed; `router.push` when you need
    a toast/local state change around navigation.

## Caching

13. **Memoize per-request fetches with React `cache()`** — e.g. the same
    query used by `generateMetadata` and the page must not run twice.
14. **Tag cached data** (`tags: [...]` on fetch/`unstable_cache`) so you can
    invalidate one slice with `revalidateTag()` instead of purging a route.
15. **`revalidateTag` vs `router.refresh()`:** tag invalidation is for
    static/tagged caches; `refresh()` re-renders dynamic server components
    (cookie/header-driven data).
16. **(If `use cache` is enabled)** `use cache` = shared/static data only;
    `use cache: private` for user-specific data touching cookies/headers.

## Routing, Loading & Errors

17. **Use `loading.tsx`** for route-level loading UI — don't convert server
    components to client just to hold a spinner in useState.
18. **Pair it with `error.tsx`** at the same segment level for a graceful
    fallback.
19. **Suspense goes around the component that *consumes* async data**, one
    level below the fetch — wrapping the awaited call itself won't stream.
20. **Fetch shared data in `layout.tsx`** (nav, current user) once, not in
    every page below it.

## Metadata, Assets & Env

21. **Dynamic metadata uses `generateMetadata()`**, never computed values in
    the static `metadata` export.
22. **Fonts via `next/font`** (this repo: Geist in `app/layout.tsx`), never
    manual Google Fonts CSS imports — avoids layout shift.
23. **`next/image` needs `sizes`** so small viewports don't download desktop
    assets.
24. **Env vars:** secrets stay unprefixed and server-only. Only
    `NEXT_PUBLIC_*` reaches the client. Never pass a secret to a client
    component as a prop.
25. **Hydration errors:** first check HTML validity (no `<div>` in `<p>`),
    then gate client-only values (dates, random, `window`) behind effects.

## Hygiene

26. **Strip `console.log` from production** — `compiler.removeConsole` with
    `{ exclude: ["error"] }` in `next.config.ts`.
27. **Review AI-generated code before shipping it** — run this checklist on
    it like any other PR.

## Project-specific reminders

28. **Next 16 uses `proxy.ts`, not `middleware.ts`**, and route protection
    lives there (`clerkMiddleware`). Public routes (webhooks) must stay
    outside the `auth.protect()` matcher.
29. **Money is integer cents; identity is the Clerk `userId`** — see
    `.context/2-architecture.md` and `.context/3-database-schema.md`.
30. **Every action button: pending state + toast.** Label flips while the
    server action runs (`useTransition`), and the outcome lands as a sonner
    toast (`toast.success` / `toast.error`). Buttons that submit a form
    ALSO need explicit `type="submit"` — Base UI Button defaults to
    `type="button"` and silently won't submit.
31. **Edit reuses the create path.** One modal/form component serves both
    add and edit (an optional entity prop switches mode); the update action
    shares the create action's full validation — never a separate,
    lighter-validated edit form. Modal state is populated on OPEN so a
    reopen after save shows fresh props, not mount-time values. Related
    child rows (e.g. splits) are rewritten atomically with their parent
    (nested `deleteMany` + `create`), and the update is scoped by the
    parent id (`groupId`) like deletes are.
32. **Bind server actions instead of cloning client components.** For
    repeated row actions (delete buttons on different entity types), write
    ONE generic client component that takes `action: () => Promise<{error?}>`
    as a prop, and have the server component pass
    `deleteThing.bind(null, parentId, rowId)`. Bound server actions are
    serializable across the RSC boundary; per-entity copies of the same
    button are not a pattern.
33. **Derived numbers must be auditable on screen.** If the UI shows a
    computed value (balances, totals, "who owes whom"), every record that
    feeds it must be visible — and removable — somewhere in the UI. A
    stored record that silently shifts the math (this repo: settlements)
    reads as a bug to the user. Corollary: deleting one record type must
    not silently cascade to another; each fact is removed explicitly.
