import Link from "next/link";
import { SignUpButton, Show } from "@clerk/nextjs";
import { ArrowRight, Globe, Percent, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

const ious = [
  { from: "Maya", to: "Ben", amount: 10 },
  { from: "Ben", to: "Priya", amount: 16 },
  { from: "Sam", to: "Priya", amount: 6 },
  { from: "Maya", to: "Priya", amount: 8 },
  { from: "Sam", to: "Ben", amount: 6 },
];

const settled = [
  { from: "Maya", to: "Priya", amount: 18 },
  { from: "Sam", to: "Priya", amount: 12 },
];

const glyphs = ["¥", "£", "€", "$", "₹", "¥"];

const features = [
  {
    icon: Percent,
    title: "Split any way",
    description: "Equally, by percentages, or exact amounts.",
  },
  {
    icon: Globe,
    title: "Any currency",
    description: "¥, €, ₹ and $ in one group.",
  },
  {
    icon: Zap,
    title: "Settle in one tap",
    description: "The fewest payments, computed for you.",
  },
];

const steps = [
  { number: "1", title: "Create a group", description: "Invite friends by email." },
  { number: "2", title: "Add expenses", description: "Any currency, any split." },
  { number: "3", title: "Settle up", description: "Fewest possible payments." },
];

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {name[0]}
    </span>
  );
}

function CurrencyGlyphs() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {glyphs.map((glyph, i) => (
        <span
          key={i}
          className="absolute text-5xl font-mono text-primary/10 animate-float"
          style={{
            left: `${8 + (i * 17) % 84}%`,
            top: `${(i * 19) % 90}%`,
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${16 + i * 2}s`,
          }}
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}

function StartButton() {
  return (
    <Show
      when="signed-out"
      fallback={
        <Link href="/dashboard">
          <Button size="lg" className="h-12 px-8 text-base">
            Start splitting — it&apos;s free
          </Button>
        </Link>
      }
    >
      <SignUpButton mode="modal">
        <Button size="lg" className="h-12 px-8 text-base">
          Start splitting — it&apos;s free
        </Button>
      </SignUpButton>
    </Show>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col flex-1 relative overflow-x-hidden">
      <CurrencyGlyphs />

      {/* Hero */}
      <section className="max-w-5xl mx-auto w-full px-6 pt-16 md:pt-24 pb-8 text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
          Split expenses,
          <br />
          <span className="text-primary">skip the mental math.</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Track shared costs in any currency. Splitter nets it all down to the
          fewest possible payments.
        </p>
        <div className="mt-8">
          <StartButton />
        </div>
      </section>

      {/* Proof: 5 IOUs → 2 payments */}
      <section className="max-w-5xl mx-auto w-full px-6 py-12 md:py-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-4">
          <div className="w-full max-w-md -rotate-1 hover:rotate-0 transition-transform">
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-bold">After the trip</h2>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  5 IOUs
                </span>
              </div>
              <div className="divide-y">
                {ious.map((d, i) => (
                  <div
                    key={`${d.from}-${d.to}-${i}`}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <Initial name={d.from} />
                    <p className="flex-1 text-sm">
                      <span className="font-medium">{d.from}</span>
                      <span className="text-muted-foreground"> owes </span>
                      <span className="font-medium">{d.to}</span>
                    </p>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      ${d.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ArrowRight
            className="h-8 w-8 shrink-0 rotate-90 lg:rotate-0 text-primary"
            aria-hidden
          />

          <div className="w-full max-w-sm rotate-1 hover:rotate-0 transition-transform">
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-bold">With Splitter</h2>
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  2 payments
                </span>
              </div>
              <div className="divide-y">
                {settled.map((d) => (
                  <div
                    key={`${d.from}-${d.to}`}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <Initial name={d.from} />
                    <p className="flex-1 text-sm">
                      <span className="font-medium">{d.from}</span>
                      <span className="text-muted-foreground"> owes </span>
                      <span className="font-medium">{d.to}</span>
                    </p>
                    <span className="text-sm font-bold text-emerald-600 tabular-nums">
                      ${d.amount}
                    </span>
                  </div>
                ))}
                <div className="px-5 py-3.5">
                  <p className="text-sm text-muted-foreground">
                    Ben owes nothing at all
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="w-full bg-muted py-16 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto w-full px-6 py-16 md:py-24 relative z-10">
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.number} className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {s.number}
              </span>
              <div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-muted py-16 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ready to stop doing math at dinner?
          </h2>
          <p className="mt-3 text-muted-foreground">
            No spreadsheets were harmed.
          </p>
          <div className="mt-8">
            <StartButton />
          </div>
        </div>
      </section>
    </div>
  );
}

