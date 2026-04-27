import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Utensils, Home, Car, Fuel, ShoppingBag, Heart, Zap, Sparkles, Plane, MoreHorizontal } from "lucide-react";
import { useMyGroups, useGroupMembers } from "@/lib/hooks/use-data";
import { expenseService } from "@/services/expense.service";
import type { ExpenseCategory, SplitType } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

const CATEGORIES: { value: ExpenseCategory; label: string; Icon: typeof Utensils }[] = [
  { value: "food", label: "FOOD", Icon: Utensils },
  { value: "rent", label: "RENT", Icon: Home },
  { value: "transport", label: "TRANSPORT", Icon: Car },
  { value: "fuel", label: "FUEL", Icon: Fuel },
  { value: "shopping", label: "SHOPPING", Icon: ShoppingBag },
  { value: "health", label: "HEALTH", Icon: Heart },
  { value: "utilities", label: "UTILS", Icon: Zap },
  { value: "entertainment", label: "FUN", Icon: Sparkles },
  { value: "travel", label: "TRAVEL", Icon: Plane },
  { value: "other", label: "OTHER", Icon: MoreHorizontal },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultGroupId?: string;
}

export function AddExpenseModal({ open, onOpenChange, defaultGroupId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: groups } = useMyGroups();

  const [groupId, setGroupId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const def = defaultGroupId ?? groups?.[0]?.id ?? "";
      setGroupId(def);
    }
  }, [open, defaultGroupId, groups]);

  const { data: members } = useGroupMembers(groupId || undefined);

  useEffect(() => {
    if (members) {
      const next: Record<string, boolean> = {};
      members.forEach((m) => { next[m.user_id] = true; });
      setSelected(next);
    }
  }, [members]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const numericAmount = parseFloat(amount) || 0;

  const splits = useMemo(() => {
    if (splitType === "equal") {
      const n = selectedIds.length || 1;
      const per = Math.round((numericAmount / n) * 100) / 100;
      return selectedIds.map((id, i) => ({
        user_id: id,
        amount: i === selectedIds.length - 1 ? Math.round((numericAmount - per * (n - 1)) * 100) / 100 : per,
      }));
    }
    return selectedIds.map((id) => ({ user_id: id, amount: parseFloat(customAmounts[id] || "0") || 0 }));
  }, [splitType, selectedIds, numericAmount, customAmounts]);

  const customTotal = splits.reduce((a, s) => a + s.amount, 0);
  const customMatch = Math.abs(customTotal - numericAmount) < 0.01;

  const mutation = useMutation({
    mutationFn: () =>
      expenseService.addExpense({
        group_id: groupId,
        amount: numericAmount,
        description,
        category,
        split_type: splitType,
        expense_date: date,
        participants: splits,
      }),
    onSuccess: () => {
      toast.success("Expense added");
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["settlements"] });
      onOpenChange(false);
      setAmount(""); setDescription(""); setCustomAmounts({});
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  const canSubmit =
    groupId && numericAmount > 0 && description.trim() && selectedIds.length > 0 &&
    (splitType === "equal" || customMatch);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-card border-glass-border">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Add Expense</DialogTitle>
          <DialogDescription className="text-center text-xs">Split a new bill across your group</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="text-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total amount</span>
            <div className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-xl text-muted-foreground">Rs.</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-40 border-none bg-transparent text-center text-4xl font-bold outline-none"
              />
            </div>
            <div className="mx-auto mt-1 h-px w-32 bg-gradient-mint" />
          </div>

          {/* Description + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Select category</span>
              <span className="text-[10px] uppercase tracking-wider text-mint">Required</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[9px] uppercase tracking-wider transition ${
                    category === value
                      ? "border-primary bg-gradient-violet text-primary-foreground shadow-glow"
                      : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Group + split type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">In group</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {(groups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
                ))}
                {!groups?.length && <option value="">No groups — create one first</option>}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Split type</label>
              <div className="mt-1 grid grid-cols-2 rounded-lg border border-input bg-surface p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setSplitType("equal")}
                  className={`rounded px-2 py-1 transition ${splitType === "equal" ? "bg-gradient-mint text-primary-foreground" : ""}`}
                >Equal</button>
                <button
                  type="button"
                  onClick={() => setSplitType("custom")}
                  className={`rounded px-2 py-1 transition ${splitType === "custom" ? "bg-gradient-mint text-primary-foreground" : ""}`}
                >Custom</button>
              </div>
            </div>
          </div>

          {/* Members */}
          {members && members.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface/50 p-2">
              {members.map((m) => (
                <label key={m.user_id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-surface-elevated">
                  <input
                    type="checkbox"
                    checked={!!selected[m.user_id]}
                    onChange={(e) => setSelected((p) => ({ ...p, [m.user_id]: e.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground"
                    style={{ background: m.profile?.identity_color ?? "var(--gradient-primary)" }}
                  >
                    {(m.profile?.display_name ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm">
                    {m.profile?.display_name}
                    {m.user_id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                  </span>
                  {splitType === "custom" && selected[m.user_id] && (
                    <input
                      type="number"
                      step="0.01"
                      value={customAmounts[m.user_id] ?? ""}
                      onChange={(e) => setCustomAmounts((p) => ({ ...p, [m.user_id]: e.target.value }))}
                      placeholder="0.00"
                      className="w-20 rounded border border-input bg-background px-2 py-1 text-right text-xs outline-none"
                    />
                  )}
                </label>
              ))}
              {splitType === "custom" && (
                <p className={`mt-2 text-center text-xs ${customMatch ? "text-success" : "text-warning"}`}>
                  Sum: Rs. {customTotal.toFixed(2)} / Rs. {numericAmount.toFixed(2)}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-primary py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Expense"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
