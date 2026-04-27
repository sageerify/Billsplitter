import { useQuery } from "@tanstack/react-query";
import { groupService } from "@/services/group.service";
import { expenseService } from "@/services/expense.service";
import { userService } from "@/services/user.service";
import { settlementService } from "@/services/settlement.service";

export const useMyProfile = () =>
  useQuery({ queryKey: ["profile", "me"], queryFn: () => userService.getCurrentProfile() });

export const useMyRoles = () =>
  useQuery({ queryKey: ["roles", "me"], queryFn: () => userService.getMyRoles() });

export const useMyGroups = () =>
  useQuery({ queryKey: ["groups", "mine"], queryFn: () => groupService.listMyGroups() });

export const useGroup = (id: string | undefined) =>
  useQuery({
    queryKey: ["group", id],
    queryFn: () => groupService.getGroup(id!),
    enabled: !!id,
  });

export const useGroupMembers = (id: string | undefined) =>
  useQuery({
    queryKey: ["group", id, "members"],
    queryFn: () => groupService.listMembers(id!),
    enabled: !!id,
  });

export const useGroupExpenses = (id: string | undefined) =>
  useQuery({
    queryKey: ["group", id, "expenses"],
    queryFn: () => expenseService.listForGroup(id!),
    enabled: !!id,
  });

export const useMySettlements = () =>
  useQuery({ queryKey: ["settlements", "mine"], queryFn: () => settlementService.listMine() });
