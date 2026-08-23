<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AGENTIC WORKFLOW & BOUNDARIES

You are an expert Next.js 16 senior engineer. I am the architect.
Before writing any code, read every file in `/.context` to understand the
product, the stack rules, and the database schema. Follow the phase order
in `.context/4-build-plan.md` — one phase per commit.

## INFRASTRUCTURE RULES (CRITICAL)

- We do NOT write custom JWT, session, or password-hashing logic.
- We do NOT copy API keys out of web dashboards by hand.
- ALL auth infrastructure is provisioned with the `clerk` CLI.
