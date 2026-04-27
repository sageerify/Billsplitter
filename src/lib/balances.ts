import type { Expense, ExpenseSplit, Settlement, Balance, DebtEdge, Profile } from "@/types";

/** Compute net balance for each user across given expenses + settlements. */
export function computeBalances(
  expenses: (Expense & { splits?: ExpenseSplit[] })[],
  settlements: Settlement[],
  profiles: Map<string, Profile>,
): Balance[] {
  const net = new Map<string, number>();
  const add = (id: string, amt: number) => net.set(id, (net.get(id) ?? 0) + amt);

  for (const e of expenses) {
    add(e.paid_by, Number(e.amount));
    for (const s of e.splits ?? []) {
      add(s.user_id, -Number(s.amount));
    }
  }
  for (const s of settlements) {
    add(s.from_user, Number(s.amount));
    add(s.to_user, -Number(s.amount));
  }

  return Array.from(net.entries()).map(([user_id, value]) => ({
    user_id,
    net: Math.round(value * 100) / 100,
    profile: profiles.get(user_id),
  }));
}

/** Greedy debt simplification: who owes whom. */
export function simplifyDebts(balances: Balance[], profiles: Map<string, Profile>): DebtEdge[] {
  const creditors = balances.filter((b) => b.net > 0.01).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.net < -0.01).map((b) => ({ ...b, net: -b.net }));

  const edges: DebtEdge[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(d.net, c.net);
    edges.push({
      from_user: d.user_id,
      to_user: c.user_id,
      amount: Math.round(amount * 100) / 100,
      from_profile: profiles.get(d.user_id),
      to_profile: profiles.get(c.user_id),
    });
    d.net -= amount;
    c.net -= amount;
    if (d.net < 0.01) i++;
    if (c.net < 0.01) j++;
  }
  return edges;
}

export function formatCurrency(amount: number, currency = "Rs.") {
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
