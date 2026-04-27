import { supabase } from "@/integrations/supabase/client";
import type { Expense, ExpenseSplit, Profile, ExpenseCategory, SplitType } from "@/types";

export interface AddExpenseInput {
  group_id: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  split_type: SplitType;
  expense_date: string;
  participants: { user_id: string; amount: number }[];
}

export const expenseService = {
  async listForGroup(groupId: string): Promise<(Expense & { payer: Profile | null; splits: ExpenseSplit[] })[]> {
    const { data: expenses, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("group_id", groupId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const expenseIds = (expenses ?? []).map((e) => e.id);
    const payerIds = Array.from(new Set((expenses ?? []).map((e) => e.paid_by)));

    const [{ data: splits }, { data: profiles }] = await Promise.all([
      expenseIds.length
        ? supabase.from("expense_splits").select("*").in("expense_id", expenseIds)
        : Promise.resolve({ data: [] as ExpenseSplit[] }),
      payerIds.length
        ? supabase.from("profiles").select("*").in("id", payerIds)
        : Promise.resolve({ data: [] as Profile[] }),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    const splitMap = new Map<string, ExpenseSplit[]>();
    (splits ?? []).forEach((s) => {
      const arr = splitMap.get(s.expense_id) ?? [];
      arr.push(s as ExpenseSplit);
      splitMap.set(s.expense_id, arr);
    });

    return (expenses ?? []).map((e) => ({
      ...(e as Expense),
      payer: profileMap.get(e.paid_by) ?? null,
      splits: splitMap.get(e.id) ?? [],
    }));
  },

  async listAllForUser(userId: string): Promise<Expense[]> {
    // RLS: returns expenses in groups I'm in
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Expense[];
  },

  async addExpense(input: AddExpenseInput): Promise<Expense> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        group_id: input.group_id,
        paid_by: user.id,
        amount: input.amount,
        description: input.description,
        category: input.category,
        split_type: input.split_type,
        expense_date: input.expense_date,
      })
      .select()
      .single();
    if (error) throw error;

    const splits = input.participants.map((p) => ({
      expense_id: expense.id,
      user_id: p.user_id,
      amount: p.amount,
    }));

    const { error: sErr } = await supabase.from("expense_splits").insert(splits);
    if (sErr) throw sErr;

    return expense as Expense;
  },

  async deleteExpense(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },
};
