import { supabase } from "@/integrations/supabase/client";
import type { Group, GroupMember, Profile } from "@/types";

export const groupService = {
  async listMyGroups(): Promise<Group[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    // RLS limits this to groups I'm a member of
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Group[];
  },

  async getGroup(id: string): Promise<Group> {
    const { data, error } = await supabase.from("groups").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Group;
  },

  async createGroup(input: { name: string; emoji?: string; description?: string }): Promise<Group> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: input.name,
        emoji: input.emoji || "💸",
        description: input.description ?? null,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Group;
  },

  async listMembers(groupId: string): Promise<(GroupMember & { profile: Profile })[]> {
    const { data: members, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);
    if (error) throw error;

    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return [];

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .in("id", ids);
    if (pErr) throw pErr;

    const map = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    return (members ?? []).map((m) => ({
      ...(m as GroupMember),
      profile: map.get(m.user_id)!,
    }));
  },

  async addMember(groupId: string, userId: string) {
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId });
    if (error) throw error;
  },

  async removeMember(groupId: string, userId: string) {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw error;
  },
};
