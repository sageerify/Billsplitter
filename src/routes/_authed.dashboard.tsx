import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Wallet, TrendingDown, TrendingUp, Users as UsersIcon, ArrowUpRight } from "lucide-react";
import { useMyGroups, useMySettlements, useMyProfile } from "@/lib/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { computeBalances, formatCurrency } from "@/lib/balances";
import type { Profile, Expense, ExpenseSplit } from "@/types";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — BillSplit Auto" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: groups } = useMyGroups();
  const { data: settlements } = useMySettlements();

  const { data: allExpenses } = useQuery({
    queryKey: ["expenses", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

  const { data: allSplits } = useQuery({
    queryKey: ["splits", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_splits").select("*");
      if (error) throw error;
      return (data ?? []) as ExpenseSplit[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const stats = useMemo(() => {
    if (!user || !allExpenses || !allSplits) return null;
    const splitsByExp = new Map<string, ExpenseSplit[]>();
    allSplits.forEach((s) => {
      const arr = splitsByExp.get(s.expense_id) ?? [];
      arr.push(s);
      splitsByExp.set(s.expense_id, arr);
    });
    const expensesWith = allExpenses.map((e) => ({ ...e, splits: splitsByExp.get(e.id) ?? [] }));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const balances = computeBalances(expensesWith, settlements ?? [], profileMap);
    const me = balances.find((b) => b.user_id === user.id);
    const totalSpent = expensesWith
      .filter((e) => e.paid_by === user.id)
      .reduce((a, e) => a + Number(e.amount), 0);
    const youOwe = me && me.net < 0 ? -me.net : 0;
    const youAreOwed = me && me.net > 0 ? me.net : 0;
    return { totalSpent, youOwe, youAreOwed, expensesWith };
  }, [user, allExpenses, allSplits, profiles, settlements]);

  const chartData = useMemo(() => {
    if (!stats?.expensesWith || !user) return [];
    const months: Record<string, { name: string; paid: number; share: number }> = {};
    stats.expensesWith.forEach((e) => {
      const d = new Date(e.expense_date);
      const k = d.toLocaleString("en", { month: "short" });
      months[k] ??= { name: k, paid: 0, share: 0 };
      if (e.paid_by === user.id) months[k].paid += Number(e.amount);
      const myShare = (e.splits ?? []).find((s) => s.user_id === user.id);
      if (myShare) months[k].share += Number(myShare.amount);
    });
    return Object.values(months).slice(-6);
  }, [stats, user]);

  const categoryData = useMemo(() => {
    if (!stats?.expensesWith) return [];
    const tot: Record<string, number> = {};
    stats.expensesWith.forEach((e) => {
      tot[e.category] = (tot[e.category] ?? 0) + Number(e.amount);
    });
    const total = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(tot)
      .map(([cat, amt]) => ({ cat, amt, pct: (amt / total) * 100 }))
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 5);
  }, [stats]);

  const currency = profile?.currency ?? "Rs.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.display_name ?? "there"}</h1>
          <p className="text-sm text-muted-foreground">Here's your kinetic ledger overview.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spent" value={formatCurrency(stats?.totalSpent ?? 0, currency)} icon={Wallet} tone="violet" />
        <StatCard label="You owe" value={formatCurrency(stats?.youOwe ?? 0, currency)} icon={TrendingDown} tone="rose" />
        <StatCard label="You're owed" value={formatCurrency(stats?.youAreOwed ?? 0, currency)} icon={TrendingUp} tone="mint" />
        <StatCard label="Active groups" value={String(groups?.length ?? 0)} icon={UsersIcon} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Spending This Month</h3>
              <p className="text-xs text-muted-foreground">Comparison of total vs personal share</p>
            </div>
          </div>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 260)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "oklch(0.7 0.02 260)" }} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.22 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }}
                    cursor={{ fill: "oklch(1 0 0 / 0.05)" }}
                  />
                  <Bar dataKey="paid" fill="oklch(0.72 0.18 285)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="share" fill="oklch(0.82 0.17 175)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold">By Category</h3>
          <div className="mt-4 space-y-3">
            {categoryData.length === 0 && <p className="text-sm text-muted-foreground">No expenses yet.</p>}
            {categoryData.map((c) => (
              <div key={c.cat}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="capitalize">{c.cat}</span>
                  <span className="text-muted-foreground">{formatCurrency(c.amt, currency)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gradient-primary" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Activity</h3>
            <Link to="/balances" className="text-xs text-mint">View all</Link>
          </div>
          <div className="space-y-2">
            {(stats?.expensesWith ?? []).slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.category}</p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(Number(e.amount), currency)}</span>
              </div>
            ))}
            {(!stats?.expensesWith || stats.expensesWith.length === 0) && (
              <p className="text-sm text-muted-foreground">No activity yet — add an expense to get started.</p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Your Groups</h3>
            <Link to="/groups" className="flex items-center gap-1 text-xs text-mint">
              Explore <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(groups ?? []).slice(0, 4).map((g) => (
              <Link
                key={g.id}
                to="/groups/$groupId"
                params={{ groupId: g.id }}
                className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{g.emoji}</span>
                  <span className="text-sm font-medium">{g.name}</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            ))}
            {!groups?.length && <p className="text-sm text-muted-foreground">No groups yet — create one!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Wallet; tone: "violet" | "rose" | "mint" | "primary" }) {
  const grad = tone === "violet" ? "bg-gradient-violet" : tone === "rose" ? "bg-gradient-rose" : tone === "mint" ? "bg-gradient-mint" : "bg-gradient-primary";
  const strip = tone === "violet" ? "accent-strip-violet" : tone === "rose" ? "accent-strip-rose" : tone === "mint" ? "accent-strip-mint" : "";
  return (
    <div className={`glass-card accent-strip ${strip} relative overflow-hidden rounded-2xl p-5 pl-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${grad}`}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Add expenses to see trends.
    </div>
  );
}
