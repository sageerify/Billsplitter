import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMySettlements, useMyProfile } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/auth-context";
import { computeBalances, simplifyDebts, formatCurrency } from "@/lib/balances";
import type { Profile, Expense, ExpenseSplit } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settlementService } from "@/services/settlement.service";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/balances")({
  component: BalancesPage,
  head: () => ({ meta: [{ title: "Balances — BillSplit Auto" }] }),
});

function BalancesPage() {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: settlements } = useMySettlements();

  const { data: expenses } = useQuery({
    queryKey: ["expenses", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

  const { data: splits } = useQuery({
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

  const debts = useMemo(() => {
    if (!expenses || !splits) return [];
    const splitsByExp = new Map<string, ExpenseSplit[]>();
    splits.forEach((s) => {
      const arr = splitsByExp.get(s.expense_id) ?? [];
      arr.push(s);
      splitsByExp.set(s.expense_id, arr);
    });
    const expWith = expenses.map((e) => ({ ...e, splits: splitsByExp.get(e.id) ?? [] }));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const bal = computeBalances(expWith, settlements ?? [], profileMap);
    return simplifyDebts(bal, profileMap);
  }, [expenses, splits, profiles, settlements]);

  const myDebts = debts.filter((d) => d.from_user === user?.id);
  const owedToMe = debts.filter((d) => d.to_user === user?.id);
  const currency = profile?.currency ?? "Rs.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Balances</h1>
        <p className="text-sm text-muted-foreground">Net debits and receivables across all your groups.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-rose">You Owe</h3>
          <div className="mt-4 space-y-2">
            {myDebts.length === 0 && <p className="text-sm text-muted-foreground">You're all clear 🎉</p>}
            {myDebts.map((d, i) => (
              <DebtRow key={i} debt={d} currency={currency} actionable />
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-mint">You Are Owed</h3>
          <div className="mt-4 space-y-2">
            {owedToMe.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending 👍</p>}
            {owedToMe.map((d, i) => (
              <DebtRow key={i} debt={d} currency={currency} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DebtRow({
  debt, currency, actionable,
}: { debt: ReturnType<typeof simplifyDebts>[number]; currency: string; actionable?: boolean }) {
  const qc = useQueryClient();
  const settle = useMutation({
    mutationFn: () => settlementService.create({ to_user: debt.to_user, amount: debt.amount }),
    onSuccess: () => {
      toast.success("Settlement recorded");
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const partner = actionable ? debt.to_profile : debt.from_profile;
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface/50 px-3 py-3">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
          style={{ background: partner?.identity_color ?? "var(--gradient-primary)" }}
        >
          {(partner?.display_name ?? "U").slice(0, 1).toUpperCase()}
        </div>
        <span className="text-sm">{partner?.display_name ?? "Someone"}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold">{formatCurrency(debt.amount, currency)}</span>
        {actionable && (
          <button
            onClick={() => settle.mutate()}
            disabled={settle.isPending}
            className="rounded-lg bg-gradient-mint px-3 py-1 text-xs font-medium text-primary-foreground"
          >
            Settle
          </button>
        )}
      </div>
    </div>
  );
}
