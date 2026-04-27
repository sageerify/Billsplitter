import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMyRoles } from "@/lib/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { supabase } from "@/integrations/supabase/client";
import { Users, FolderOpen, Receipt, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/balances";
import type { Expense, Group } from "@/types";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — BillSplit Auto" }] }),
});

function AdminPage() {
  const { data: roles, isLoading: loadingRoles } = useMyRoles();
  const isAdmin = (roles ?? []).includes("admin");

  const { data: profiles } = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: () => userService.listAllProfiles(),
    enabled: isAdmin,
  });

  const { data: groups } = useQuery({
    queryKey: ["admin", "groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*");
      if (error) throw error;
      return (data ?? []) as Group[];
    },
    enabled: isAdmin,
  });

  const { data: expenses } = useQuery({
    queryKey: ["admin", "expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
    enabled: isAdmin,
  });

  if (loadingRoles) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn't have admin privileges. Ask an existing admin to grant you access.
        </p>
      </div>
    );
  }

  const total = (expenses ?? []).reduce((a, e) => a + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <span className="rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary-foreground">Admin</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Users" value={profiles?.length ?? 0} icon={Users} />
        <Stat label="Active Groups" value={groups?.length ?? 0} icon={FolderOpen} />
        <Stat label="Total Expenses" value={expenses?.length ?? 0} sub={formatCurrency(total)} icon={Receipt} />
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-4 font-semibold">Manage Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2">User</th>
                <th className="py-2">Joined</th>
                <th className="py-2">Currency</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                        style={{ background: p.identity_color }}
                      >
                        {p.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{p.display_name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-muted-foreground">{p.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon }: { label: string; value: number | string; sub?: string; icon: typeof Users }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs text-mint">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-violet">
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}
