import { createFileRoute } from "@tanstack/react-router";
import { useMyGroups } from "@/lib/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/balances";
import { useMyProfile } from "@/lib/hooks/use-data";
import { useMemo } from "react";
import type { Expense } from "@/types";

export const Route = createFileRoute("/_authed/reports")({
  component: Reports,
  head: () => ({ meta: [{ title: "Reports — BillSplit Auto" }] }),
});

function Reports() {
  const { data: profile } = useMyProfile();
  const { data: groups } = useMyGroups();
  const { data: expenses } = useQuery({
    queryKey: ["expenses", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

  const currency = profile?.currency ?? "Rs.";
  const top = useMemo(() => (expenses ?? []).slice().sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5), [expenses]);
  const total = (expenses ?? []).reduce((a, e) => a + Number(e.amount), 0);

  const byGroup = useMemo(() => {
    const m = new Map<string, number>();
    (expenses ?? []).forEach((e) => m.set(e.group_id, (m.get(e.group_id) ?? 0) + Number(e.amount)));
    return Array.from(m.entries()).map(([gid, amt]) => ({
      group: groups?.find((g) => g.id === gid),
      amount: amt,
    }));
  }, [expenses, groups]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Spending insights across all groups.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card accent-strip accent-strip-violet rounded-2xl p-5 pl-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Spend</p>
          <p className="mt-2 text-3xl font-bold text-gradient">{formatCurrency(total, currency)}</p>
        </div>
        <div className="glass-card accent-strip accent-strip-mint rounded-2xl p-5 pl-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Groups</p>
          <p className="mt-2 text-3xl font-bold">{groups?.length ?? 0}</p>
        </div>
        <div className="glass-card accent-strip accent-strip-rose rounded-2xl p-5 pl-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Expenses</p>
          <p className="mt-2 text-3xl font-bold">{expenses?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold">Top 5 Expenses</h3>
          <div className="mt-4 space-y-2">
            {top.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.category}</p>
                </div>
                <span className="text-sm font-bold">{formatCurrency(Number(e.amount), currency)}</span>
              </div>
            ))}
            {top.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold">By Group</h3>
          <div className="mt-4 space-y-3">
            {byGroup.map((b, i) => (
              <div key={i}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{b.group?.emoji} {b.group?.name ?? "Unknown"}</span>
                  <span className="text-muted-foreground">{formatCurrency(b.amount, currency)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gradient-mint" style={{ width: `${(b.amount / (total || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
            {byGroup.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
