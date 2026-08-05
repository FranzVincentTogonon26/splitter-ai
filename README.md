# 💸 Splitter — Starter

Build a full-stack Splitwise clone the **agentic way**. This repo is the
starting point: a plain Next.js 16 scaffold plus everything the AI agent
needs to build the app *correctly* — the spec, the rules, the skills, and
the mock data. You supply the prompts.

**Stack you'll end up with:** Next.js 16 (App Router, `proxy.ts`) ·
Tailwind v4 + shadcn/ui · Prisma 7 + SQLite · Clerk `@clerk/nextjs`

## What's in the box

| Piece | Where | What it does |
|---|---|---|
| Context (the spec) | [`.context/`](.context/) | Product overview, architecture invariants, DB schema, and the phase-by-phase build plan |
| Rules & custom commands | [`AGENTS.md`](AGENTS.md) | Infrastructure rules (all auth via the Clerk CLI — never hand-rolled) and the `/clerk-setup`, `/architect-math`, `/webhook-sync` commands |
| Project skills | [`.claude/skills/`](.claude/skills/) | `landing-page-design` and `nextjs-review` — authored expert knowledge the agent loads on demand |
| Pinned vendor skills | [`skills-lock.json`](skills-lock.json) | Prisma skills, versioned like a lockfile |
| Mock data | [`lib/`](lib/) | Typed view-models + fixtures for Phase 2, shaped to match the future Prisma models |

## Setup

1. Prerequisites: Node 20+, [Claude Code](https://claude.com/claude-code),
   and the [Clerk CLI](https://clerk.com/docs/cli) (`npm i -g @clerk/cli`).
2. `npm install`
3. Restore the pinned Prisma skills: `npx skills add prisma/skills`
   (hashes are pinned in `skills-lock.json`).
4. Open the repo in Claude Code. The agent reads `CLAUDE.md` → `AGENTS.md`
   → `.context/` automatically.

## How to build

Follow [`.context/4-build-plan.md`](.context/4-build-plan.md) — **one phase,
one commit**. Check items off as they land.

- **Phase 1:** type `/clerk-setup`. The agent walks you through
  `clerk init --framework next` (keys land in `.env.local` — no dashboard
  copy-paste) and scaffolds middleware, provider, and auth pages. Verify
  with `clerk doctor`.
- **Phase 2:** point the agent at the plan — *"Build phase 2 from the build
  plan against the mock data in `lib/`."*
- **Phase 3:** same pattern; the Prisma skills kick in automatically.
- **Phase 4:** type `/architect-math`. The agent must explain the debt
  algorithm and wait for your approval before writing code.
- **Phase 5:** type `/webhook-sync`.
- **Phases 6–11:** one prompt each, always anchored to the build plan.

Keys missing later? `clerk env pull`. Before real keys exist, Clerk runs in
**Keyless mode** — the app works immediately.

## The habit this repo teaches

Short prompts, rich context. When the agent gets something wrong, don't
just fix the code — fix the context (`.context/`, `AGENTS.md`, or a skill)
so the correction sticks for every future session.
