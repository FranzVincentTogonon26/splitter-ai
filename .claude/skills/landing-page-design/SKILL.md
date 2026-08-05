---
name: landing-page-design
description: Design spec for Splitter's marketing/landing pages. Use when
  building or restyling the landing page (app/page.tsx), hero sections,
  feature grids, pricing, or any public marketing surface. Encodes layout
  blueprint, copy voice, theme-token usage, and anti-generic-design rules.
---

# Splitter Landing Page Design

Audience: people who split bills with friends and are tired of mental math.
The page must feel like the product: instant, friendly, zero ceremony.

## Hard rules

1. **Theme tokens only.** Colors come from the CSS variables in
   `app/globals.css` (currently tweakcn *northern-lights*: aurora-green
   `primary`, blue `secondary`, cyan `accent`). Never hardcode hex values.
   Emerald = money owed to you, rose = money you owe — reserve them for
   money, don't decorate with them.
2. **shadcn/ui components** from `components/ui/` for anything interactive
   (Button, Card, Badge…). Base UI: `render` prop, and `nativeButton={false}`
   when rendering a `<Link>`.
3. **Minimal copy.** No explainer paragraphs, no feature essays. Headline ≤ 8
   words, subhead ≤ 2 sentences, feature blurbs ≤ 12 words. Every section
   earns its place or gets cut.
4. **Auth-aware CTAs.** Signed-out: `SignUpButton mode="modal"`. Signed-in:
   link to `/dashboard` (`<Show when="signed-in">` / `fallback`). Never a
   dead CTA.
5. **Server component.** The landing page stays a server component; extract
   client islands only for real interactivity.

## Layout blueprint (top to bottom)

1. **Hero** — headline with one `text-primary` accent phrase, subhead, single
   primary CTA. Below it, a *product proof*: a mocked "who owes whom" card
   showing 5 messy debts collapsing to 2 payments — the algorithm IS the
   pitch. Render it with real UI components (Card, Badge, avatars), not a
   screenshot.
2. **Three features, one row** — equal Cards: flexible splits ("equally, by
   %, exact"), any currency ("¥, €, ₹ in one group"), one-tap settle
   ("fewest possible payments"). Icon (lucide), 3-word title, one line.
3. **How it works** — three numbered steps inline: create a group → add
   expenses → settle up. One line each.
4. **Final CTA** — restate the headline promise + the same primary CTA.
   No footer links needed yet.

## Feel

- Whitespace over borders; `bg-muted/40` section alternation, generous
  `py-20`+ section padding, `max-w-5xl` container like the app.
- Typography: `tracking-tight` bold headings (Plus Jakarta Sans is already
  loaded); `text-muted-foreground` for all supporting text.
- Motion: playful but cheap — `tw-animate-css` entrance fades/slides,
  hover micro-interactions (lift, tilt-to-straighten), and slow ambient
  float on *decorative* accents only (e.g. background currency glyphs).
  Nothing parallax, nothing that competes with the CTA, no client JS for
  decoration.
- Personality: currency glyphs (¥ € ₹ $) as decoration are welcome — they're
  text, not emoji. Microcopy can wink once per page (e.g. "No spreadsheets
  were harmed"), never twice.
- **Anti-slop:** no purple gradients, no glassmorphism, no emoji-per-bullet,
  no fake logos/testimonials, no "Trusted by 10,000 teams" until it's true.
  The 💸 logo emoji in the header is the only emoji allowed above the fold.

## Checklist before done

- [ ] Renders correctly signed-in AND signed-out
- [ ] Mobile: hero stacks, feature row wraps, no horizontal scroll
- [ ] All colors are theme tokens; money colors only on money
- [ ] `npm run build` passes; page stays a server component
