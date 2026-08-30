import { SignUpButton, Show } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, CreditCard, Globe, Zap, Check, ChevronRight } from "lucide-react";

const debtsBefore = [
  { from: "You", to: "Alex", amount: 45.0 },
  { from: "You", to: "Sam", amount: 32.5 },
  { from: "You", to: "Jordan", amount: 28.0 },
  { from: "You", to: "Taylor", amount: 19.75 },
  { from: "Sam", to: "Alex", amount: 15.0 },
];

const debtsAfter = [
  { from: "You", to: "Alex", amount: 85.25 },
  { from: "Sam", to: "Taylor", amount: 17.5 },
];

const currencyGlyphs = ["$", "€", "¥", "£", "₹", "₩", "C$", "A$", "CHF", "HK$"];

function DebtRow({
  from,
  to,
  amount,
  showCheck = false,
  isAfter = false,
}: {
  from: string;
  to: string;
  amount: number;
  showCheck?: boolean;
  isAfter?: boolean;
}) {
  return (
    <div
      key={`${from}-${to}`}
      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
        isAfter ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs font-medium">{from[0]}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{from}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs font-medium">{to[0]}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{to}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={isAfter ? "success" : "outline"}
          className="text-xs font-medium"
        >
          ${amount.toFixed(2)}
        </Badge>
        {showCheck && <Check className="h-4 w-4 text-emerald-500" />}
      </div>
    </div>
  );
}

function ProofCard() {
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Who owes whom</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          5 messy IOUs → 2 clean payments
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="space-y-2">
          {debtsBefore.map((debt) => (
            <DebtRow key={`${debt.from}-${debt.to}`} {...debt} />
          ))}
        </div>
        <div className="flex items-center justify-center my-4">
          <ArrowRight className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          {debtsAfter.map((debt) => (
            <DebtRow key={`${debt.from}-${debt.to}`} {...debt} showCheck isAfter />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col h-full group hover:shadow-lg transition-shadow duration-200">
      <CardContent className="flex flex-col h-full p-6">
        <div className="mb-4 p-2 bg-primary/10 rounded-lg w-fit group-hover:scale-105 transition-transform">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground flex-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg">
        {number}
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CurrencyGlyphs() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {currencyGlyphs.map((glyph, i) => (
        <span
          key={glyph}
          className="absolute text-4xl font-mono text-primary/5 animate-float"
          style={{
            left: `${(i * 100) / currencyGlyphs.length}%`,
            top: `${(i * 7) % 100}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${15 + i * 2}s`,
          }}
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}

export default async function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-x-hidden">
      <CurrencyGlyphs />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 relative z-10">
        <section className="py-20 md:py-32 text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            Shared expenses,{" "}
            <span className="text-primary">minimized debts</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Add expenses in any currency. Splitter calculates the fewest payments
            to settle up — so nobody overpays.
          </p>
          <Show
            when="signed-out"
            fallback={
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  <span>Get started free</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            }
          >
            <SignUpButton mode="modal">
              <Button size="lg" className="gap-2">
                <span>Get started free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SignUpButton>
          </Show>
        </section>

        <section className="py-20 bg-muted/40 rounded-2xl" aria-labelledby="proof-heading">
          <div className="px-6">
            <h2 id="proof-heading" className="sr-only">
              How the algorithm works
            </h2>
            <ProofCard />
          </div>
        </section>

        <section className="py-20" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={CreditCard}
              title="Flexible splits"
              description="Equal, by percentage, or exact amounts — per expense."
            />
            <FeatureCard
              icon={Globe}
              title="Any currency"
              description="¥, €, ₹ in one group. Converted at entry, displayed in yours."
            />
            <FeatureCard
              icon={Zap}
              title="One-tap settle"
              description="Fewest possible payments. Either party can record it."
            />
          </div>
        </section>

        <section className="py-20 bg-muted/40 rounded-2xl" aria-labelledby="how-heading">
          <div className="px-6">
            <h2 id="how-heading" className="sr-only">How it works</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
              <Step
                number="1"
                title="Create a group"
                description="Invite friends by email. They join with their Splitter account."
              />
              <Step
                number="2"
                title="Add expenses"
                description="Paid by one, split however you want. Any currency works."
              />
              <Step
                number="3"
                title="Settle up"
                description="See who owes whom. Tap to record payment — done."
              />
            </div>
          </div>
        </section>

        <section className="py-20 text-center" aria-labelledby="cta-heading">
          <h2
            id="cta-heading"
            className="text-2xl md:text-3xl font-semibold tracking-tight mb-4"
          >
            Stop doing the math.{" "}
            <span className="text-primary">Start splitting.</span>
          </h2>
          <Show
            when="signed-out"
            fallback={
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  <span>Get started free</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            }
          >
            <SignUpButton mode="modal">
              <Button size="lg" className="gap-2">
                <span>Get started free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SignUpButton>
          </Show>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center text-sm text-muted-foreground">
          No spreadsheets were harmed.
        </div>
      </footer>
    </div>
  );
}