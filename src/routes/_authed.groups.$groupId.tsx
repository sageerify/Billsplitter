import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, UserPlus, Loader2, Search } from "lucide-react";
import { useGroup, useGroupMembers, useGroupExpenses, useMyProfile } from "@/lib/hooks/use-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { groupService } from "@/services/group.service";
import { userService } from "@/services/user.service";
import { computeBalances, simplifyDebts, formatCurrency } from "@/lib/balances";
import { useAuth } from "@/lib/auth-context";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Profile } from "@/types";
import { toast } from "sonner";
import { settlementService } from "@/services/settlement.service";

export const Route = createFileRoute("/_authed/groups/$groupId")({
  component: GroupDetail,
});

function GroupDetail() {
  const { groupId } = Route.useParams();
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: group } = useGroup(groupId);
  const { data: members } = useGroupMembers(groupId);
  const { data: expenses } = useGroupExpenses(groupId);

  const [addOpen, setAddOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);

  const currency = profile?.currency ?? "Rs.";

  const totals = useMemo(() => {
    const total = (expenses ?? []).reduce((a, e) => a + Number(e.amount), 0);
    const myShare = (expenses ?? []).reduce((a, e) => {
      const s = (e.splits ?? []).find((x) => x.user_id === user?.id);
      return a + (s ? Number(s.amount) : 0);
    }, 0);
    const myPaid = (expenses ?? []).filter((e) => e.paid_by === user?.id).reduce((a, e) => a + Number(e.amount), 0);
    return { total, myShare, myPaid, net: myPaid - myShare };
  }, [expenses, user]);

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    (members ?? []).forEach((mb) => m.set(mb.user_id, mb.profile));
    return m;
  }, [members]);

  const balances = useMemo(
    () => computeBalances(expenses ?? [], [], profileMap),
    [expenses, profileMap],
  );
  const debts = useMemo(() => simplifyDebts(balances, profileMap), [balances, profileMap]);

  if (!group) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/groups" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Groups
      </Link>

      <div className="glass-card rounded-2xl bg-gradient-to-br from-violet/20 via-transparent to-mint/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <span className="text-4xl">{group.emoji}</span> {group.name}
            </h1>
            <button
              onClick={() => setMemberOpen(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-mint hover:underline"
            >
              <UserPlus className="h-3 w-3" /> Add Member
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Total spent" value={formatCurrency(totals.total, currency)} />
            <MiniStat label="You paid" value={formatCurrency(totals.myPaid, currency)} tone="mint" />
            <MiniStat
              label={totals.net >= 0 ? "You're owed" : "You owe"}
              value={formatCurrency(Math.abs(totals.net), currency)}
              tone={totals.net >= 0 ? "mint" : "rose"}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="bg-surface">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-2">
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
          <div className="glass-card rounded-2xl p-2">
            {(expenses ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No expenses yet.</p>
            ) : (
              (expenses ?? []).map((e) => {
                const myShare = (e.splits ?? []).find((s) => s.user_id === user?.id);
                const youGet = e.paid_by === user?.id;
                return (
                  <div key={e.id} className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-violet text-primary-foreground">
                        <span className="text-xs font-bold">{e.category.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.payer?.display_name ?? "Someone"} paid {formatCurrency(Number(e.amount), currency)} · {new Date(e.expense_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${youGet ? "text-mint" : "text-rose"}`}>
                        {youGet ? "You lent" : "Your share"}
                      </p>
                      <p className="text-sm font-bold">{formatCurrency(youGet ? Number(e.amount) - (myShare?.amount ?? 0) : Number(myShare?.amount ?? 0), currency)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="balances" className="mt-4 space-y-3">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold">Who owes whom</h3>
            <div className="mt-4 space-y-2">
              {debts.length === 0 ? (
                <p className="text-sm text-muted-foreground">All settled up 🎉</p>
              ) : (
                debts.map((d, i) => (
                  <SettleRow
                    key={i}
                    debt={d}
                    currency={currency}
                    isMine={d.from_user === user?.id}
                    groupId={groupId}
                  />
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="glass-card rounded-2xl p-2">
            {(members ?? []).map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-xl px-3 py-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                  style={{ background: m.profile?.identity_color ?? "var(--gradient-primary)" }}
                >
                  {(m.profile?.display_name ?? "U").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm">{m.profile?.display_name}</span>
                {m.user_id === group.created_by && (
                  <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Owner</span>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AddExpenseModal open={addOpen} onOpenChange={setAddOpen} defaultGroupId={groupId} />
      <AddMemberModal open={memberOpen} onOpenChange={setMemberOpen} groupId={groupId} />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "mint" | "rose" }) {
  const cls = tone === "mint" ? "text-mint" : tone === "rose" ? "text-rose" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function SettleRow({
  debt, currency, isMine, groupId,
}: { debt: ReturnType<typeof simplifyDebts>[number]; currency: string; isMine: boolean; groupId: string }) {
  const qc = useQueryClient();
  const settle = useMutation({
    mutationFn: () => settlementService.create({ to_user: debt.to_user, amount: debt.amount, group_id: groupId }),
    onSuccess: () => {
      toast.success("Marked as settled");
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      qc.invalidateQueries({ queryKey: ["settlements"] });
    },
  });

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <Avatar profile={debt.from_profile} />
        <span className="text-sm">{debt.from_profile?.display_name ?? "Someone"}</span>
        <span className="text-muted-foreground">owes</span>
        <Avatar profile={debt.to_profile} />
        <span className="text-sm">{debt.to_profile?.display_name ?? "Someone"}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold">{formatCurrency(debt.amount, currency)}</span>
        {isMine && (
          <button
            onClick={() => settle.mutate()}
            disabled={settle.isPending}
            className="rounded-lg bg-gradient-mint px-3 py-1 text-xs font-medium text-primary-foreground"
          >
            {settle.isPending ? "..." : "Settle"}
          </button>
        )}
      </div>
    </div>
  );
}

function Avatar({ profile }: { profile?: Profile }) {
  return (
    <div
      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground"
      style={{ background: profile?.identity_color ?? "var(--gradient-primary)" }}
    >
      {(profile?.display_name ?? "U").slice(0, 1).toUpperCase()}
    </div>
  );
}

function AddMemberModal({ open, onOpenChange, groupId }: { open: boolean; onOpenChange: (v: boolean) => void; groupId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: results } = useQuery({
    queryKey: ["search-profiles", q],
    queryFn: () => userService.searchProfiles(q),
    enabled: q.length >= 2,
  });

  const add = useMutation({
    mutationFn: (userId: string) => groupService.addMember(groupId, userId),
    onSuccess: () => {
      toast.success("Member added");
      qc.invalidateQueries({ queryKey: ["group", groupId, "members"] });
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by display name..."
              className="w-full rounded-lg border border-input bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {(results ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => add.mutate(p.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                  style={{ background: p.identity_color }}
                >
                  {p.display_name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm">{p.display_name}</span>
              </button>
            ))}
            {q.length >= 2 && (results ?? []).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No users found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
