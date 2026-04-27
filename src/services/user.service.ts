import { supabase } from "@/integrations/supabase/client";
import type { Profile, AppRole } from "@/types";

export const userService = {
  async getCurrentProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  },

  async updateProfile(updates: Partial<Pick<Profile, "display_name" | "avatar_url" | "currency" | "identity_color">>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async getProfilesByIds(ids: string[]): Promise<Profile[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
    if (error) throw error;
    return (data ?? []) as Profile[];
  },

  async searchProfiles(query: string): Promise<Profile[]> {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("display_name", `%${query}%`)
      .limit(10);
    if (error) throw error;
    return (data ?? []) as Profile[];
  },

  async getMyRoles(): Promise<AppRole[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (error) throw error;
    return (data ?? []).map((r) => r.role as AppRole);
  },

  async listAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Profile[];
  },
};
