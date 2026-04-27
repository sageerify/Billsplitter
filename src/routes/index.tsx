import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Wallet, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "BillSplit Auto — Smart Ledger for Group Expenses" },
      {
        name: "description",
        content:
          "Split bills, track balances, and settle up effortlessly. The kinetic ledger for high-velocity group finances.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-hero opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-mint/20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            BillSplit <span className="text-gradient-mint">Auto</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 transition"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Auto-sync ledger active
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-tight md:text-6xl">
              The future of group{" "}
              <span className="text-gradient-mint">ledgering.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Precision-engineered expense tracking for high-velocity lifestyles.
              Split bills across currencies and members in real time, then settle
              with one tap.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 font-medium text-primary-foreground shadow-glow hover:opacity-90 transition"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-xl border border-border bg-surface/40 px-6 py-3 font-medium backdrop-blur hover:bg-surface transition"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <FeatureCard
              icon={Wallet}
              title="Split easily"
              desc="Advanced algorithms handle complex splits across multiple currencies and participants instantly."
              variant="violet"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Track balances"
              desc="Real-time visibility into net debit and receivable status across every group."
              variant="mint"
            />
            <FeatureCard
              icon={Users}
              title="Settle fast"
              desc="One-tap settlement triggers that simplify complex chain reimbursements."
              variant="rose"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  variant,
}: {
  icon: typeof Sparkles;
  title: string;
  desc: string;
  variant: "violet" | "mint" | "rose";
}) {
  const grad =
    variant === "violet" ? "bg-gradient-violet" : variant === "mint" ? "bg-gradient-mint" : "bg-gradient-rose";
  return (
    <div className="glass-card flex items-start gap-4 rounded-2xl p-5 transition hover:scale-[1.01]">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${grad}`}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
