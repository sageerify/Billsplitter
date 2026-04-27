import { supabase } from "@/integrations/supabase/client";
import type { Settlement } from "@/types";

export const settlementService = {
  async listMine(): Promise<Settlement[]> {
    const { data, error } = await supabase
      .from("settlements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Settlement[];
  },

  async create(input: {
    to_user: string;
    amount: number;
    method?: string;
    note?: string;
    group_id?: string | null;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("settlements")
      .insert({
        from_user: user.id,
        to_user: input.to_user,
        amount: input.amount,
        method: input.method ?? "cash",
        note: input.note ?? null,
        group_id: input.group_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Settlement;
  },
};
