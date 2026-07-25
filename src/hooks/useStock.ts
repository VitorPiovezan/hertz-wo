"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatShelf } from "@/lib/search";
import type { OrderStockItem, StockItem } from "@/types";

/**
 * O estoque chega pela migração 003. Enquanto ela não roda no Supabase, a
 * consulta falha e as telas mostram o aviso em vez de quebrar.
 */
let stockTableAvailable: boolean | null = null;

export function stockTableIsAvailable() {
  return stockTableAvailable !== false;
}

export function useStockItems() {
  return useQuery({
    queryKey: ["stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("*")
        .order("name", { ascending: true });
      if (error) {
        stockTableAvailable = false;
        throw error;
      }
      stockTableAvailable = true;
      return (data ?? []).map(normalizeItem);
    },
    retry: false,
  });
}

/** `aliases` volta como jsonb; garante array de string e prateleira formatada. */
function normalizeItem(row: Record<string, unknown>): StockItem {
  const aliases = row.aliases;
  return {
    ...(row as unknown as StockItem),
    aliases: Array.isArray(aliases) ? (aliases as string[]) : [],
    shelf: formatShelf(row.shelf as string | undefined) || undefined,
    quantity: Number(row.quantity ?? 0),
  };
}

export interface StockItemInput {
  name: string;
  aliases: string[];
  shelf?: string;
  quantity: number;
  notes?: string;
}

export function useCreateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockItemInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("stock_items")
        .insert({
          user_id: user!.id,
          name: input.name,
          aliases: input.aliases,
          shelf: formatShelf(input.shelf) || null,
          quantity: input.quantity,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock"] }),
  });
}

export function useUpdateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: StockItemInput & { id: string }) => {
      const { error } = await supabase
        .from("stock_items")
        .update({
          name: input.name,
          aliases: input.aliases,
          shelf: formatShelf(input.shelf) || null,
          quantity: input.quantity,
          notes: input.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock"] }),
  });
}

export function useDeleteStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock"] }),
  });
}

/**
 * Soma `delta` à quantidade do item (negativo para saída).
 *
 * Relê a quantidade antes de gravar em vez de confiar no valor que a tela
 * tinha: entre abrir a tela e clicar, o número pode ter mudado — por uma OS,
 * por exemplo.
 */
export async function adjustStockQuantity(itemId: string, delta: number) {
  if (!delta) return;
  const { data, error: readError } = await supabase
    .from("stock_items")
    .select("quantity")
    .eq("id", itemId)
    .single();
  if (readError) throw readError;

  const atual = Number(data?.quantity ?? 0);
  const { error } = await supabase
    .from("stock_items")
    .update({ quantity: atual + delta })
    .eq("id", itemId);
  if (error) throw error;
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, delta }: { itemId: string; delta: number }) =>
      adjustStockQuantity(itemId, delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock"] }),
  });
}

// --- Uso de itens dentro de uma OS ------------------------------------------

export function useOrderStockItems(orderId: string) {
  return useQuery({
    queryKey: ["order-stock", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_stock_items")
        .select("*, item:stock_items(*)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) {
        stockTableAvailable = false;
        throw error;
      }
      stockTableAvailable = true;
      return (data ?? []) as unknown as OrderStockItem[];
    },
    enabled: !!orderId,
    retry: false,
  });
}

function invalidateUsage(qc: ReturnType<typeof useQueryClient>, orderId: string) {
  qc.invalidateQueries({ queryKey: ["order-stock", orderId] });
  qc.invalidateQueries({ queryKey: ["stock"] });
  qc.invalidateQueries({ queryKey: ["orders"] });
  qc.invalidateQueries({ queryKey: ["orders", orderId] });
}

/** Registra o uso na OS e dá baixa da mesma quantidade no estoque. */
export function useAddOrderStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      item,
      quantity,
    }: {
      orderId: string;
      item: StockItem;
      quantity: number;
    }) => {
      const { error } = await supabase.from("order_stock_items").insert({
        order_id: orderId,
        item_id: item.id,
        item_name: item.name,
        quantity,
      });
      if (error) throw error;
      await adjustStockQuantity(item.id, -quantity);
    },
    onSuccess: (_, vars) => invalidateUsage(qc, vars.orderId),
  });
}

/** Aplica só a diferença: mudar de 2 para 3 tira mais 1 do estoque. */
export function useUpdateOrderStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      usage,
      quantity,
    }: {
      usage: OrderStockItem;
      quantity: number;
    }) => {
      const delta = quantity - Number(usage.quantity);
      const { error } = await supabase
        .from("order_stock_items")
        .update({ quantity })
        .eq("id", usage.id);
      if (error) throw error;
      if (usage.item_id) await adjustStockQuantity(usage.item_id, -delta);
    },
    onSuccess: (_, vars) => invalidateUsage(qc, vars.usage.order_id),
  });
}

/** Remover o uso devolve a quantidade ao estoque. */
export function useRemoveOrderStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ usage }: { usage: OrderStockItem }) => {
      const { error } = await supabase
        .from("order_stock_items")
        .delete()
        .eq("id", usage.id);
      if (error) throw error;
      if (usage.item_id) await adjustStockQuantity(usage.item_id, Number(usage.quantity));
    },
    onSuccess: (_, vars) => invalidateUsage(qc, vars.usage.order_id),
  });
}

/**
 * Devolve ao estoque tudo que uma OS consumiu.
 * Usado antes de excluir a OS — o cascade apagaria os registros de uso sem
 * repor o saldo, e as peças voltam para a prateleira na prática.
 */
export async function restoreStockFromOrder(orderId: string) {
  const { data, error } = await supabase
    .from("order_stock_items")
    .select("item_id, quantity")
    .eq("order_id", orderId);
  if (error || !data) return;

  for (const uso of data) {
    if (uso.item_id) {
      try {
        await adjustStockQuantity(uso.item_id as string, Number(uso.quantity));
      } catch {
        // Um item excluído do estoque não impede a exclusão da OS.
      }
    }
  }
}
