"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Budget, BudgetItem } from "@/types";

const BUDGET_SELECT = `*, client:clients(*), items:budget_items(*)`;

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select(BUDGET_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Budget[];
    },
  });
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: ["budgets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select(BUDGET_SELECT)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Budget;
    },
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items,
      ...budget
    }: Omit<Budget, "id" | "user_id" | "created_at" | "client" | "items"> & {
      items?: Omit<BudgetItem, "id" | "budget_id">[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("budgets")
        .insert({ ...budget, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      if (items && items.length > 0) {
        const { error: ie } = await supabase
          .from("budget_items")
          .insert(items.map((i) => ({ ...i, budget_id: data.id })));
        if (ie) throw ie;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
      ...budget
    }: Omit<Partial<Budget>, "items"> & { id: string; items?: Omit<BudgetItem, "id" | "budget_id">[] }) => {
      const { data, error } = await supabase
        .from("budgets")
        .update(budget)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (items !== undefined) {
        await supabase.from("budget_items").delete().eq("budget_id", id);
        if (items.length > 0) {
          await supabase
            .from("budget_items")
            .insert(items.map((i) => ({ ...i, budget_id: id })));
        }
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budgets", vars.id] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
