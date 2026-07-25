"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Budget, BudgetItem } from "@/types";

const BUDGET_SELECT = `*, client:clients(*), items:budget_items(*)`;

/**
 * `internal_notes` chega pela migração 002. Enquanto ela não roda no Supabase,
 * gravar esse campo devolve erro de coluna inexistente — então a escrita é
 * repetida sem ele e o resto do orçamento é salvo normalmente. A leitura é
 * segura porque o select é `*`.
 */
export function internalNotesIsAvailable() {
  return internalNotesAvailable !== false;
}
let internalNotesAvailable: boolean | null = null;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "PGRST204" || /internal_notes/i.test(error.message ?? "");
}

/** Executa a escrita; se a coluna ainda não existe, refaz sem ela. */
type WriteResult = { data: unknown; error: { code?: string; message?: string } | null };

async function withInternalNotesFallback<T extends { internal_notes?: string | null }>(
  payload: T,
  // O builder do supabase-js é thenable, não Promise.
  run: (p: Record<string, unknown>) => PromiseLike<WriteResult>
): Promise<WriteResult> {
  if (internalNotesAvailable !== false) {
    const first = await run(payload as Record<string, unknown>);
    if (!first.error) {
      internalNotesAvailable = true;
      return first;
    }
    if (!isMissingColumnError(first.error)) return first;
    internalNotesAvailable = false;
  }
  const { internal_notes, ...rest } = payload;
  void internal_notes;
  return run(rest as Record<string, unknown>);
}

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
      const { data, error } = (await withInternalNotesFallback(
        { ...budget, user_id: user!.id },
        (p) => supabase.from("budgets").insert(p).select().single()
      )) as { data: { id: string }; error: { message?: string } | null };
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
      const { data, error } = (await withInternalNotesFallback(budget, (p) =>
        supabase.from("budgets").update(p).eq("id", id).select().single()
      )) as { data: unknown; error: { message?: string } | null };
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
