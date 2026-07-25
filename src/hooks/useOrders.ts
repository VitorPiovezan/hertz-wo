"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ServiceOrder, OrderValue, OrderPayment, PaymentMethod } from "@/types";
import { resolvePaymentStatus, sumValues } from "@/lib/utils";
import { restoreStockFromOrder } from "@/hooks/useStock";

const ORDER_SELECT_LEGACY = `*, client:clients(*), values:order_values(*), messages:order_messages(*)`;
const ORDER_SELECT = `${ORDER_SELECT_LEGACY}, payments:order_payments(*)`;

/**
 * `order_payments` chega pela migração 001. Enquanto ela não é rodada no
 * Supabase, o PostgREST devolve erro para o embed inteiro — então caímos no
 * select antigo e o app segue funcionando com o acumulado em payment_amount.
 * O resultado fica em cache para não pagar duas requisições toda vez.
 */
let paymentsTableAvailable: boolean | null = null;

export function paymentsTableIsAvailable() {
  return paymentsTableAvailable !== false;
}

function buildQuery(select: string) {
  return supabase.from("service_orders").select(select);
}

async function fetchOrders(): Promise<ServiceOrder[]> {
  if (paymentsTableAvailable !== false) {
    const { data, error } = await buildQuery(ORDER_SELECT).order("created_at", { ascending: false });
    if (!error) {
      paymentsTableAvailable = true;
      return data as unknown as ServiceOrder[];
    }
    paymentsTableAvailable = false;
  }
  const { data, error } = await buildQuery(ORDER_SELECT_LEGACY).order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as ServiceOrder[];
}

async function fetchOrder(id: string): Promise<ServiceOrder> {
  if (paymentsTableAvailable !== false) {
    const { data, error } = await buildQuery(ORDER_SELECT).eq("id", id).single();
    if (!error) {
      paymentsTableAvailable = true;
      return data as unknown as ServiceOrder;
    }
    paymentsTableAvailable = false;
  }
  const { data, error } = await buildQuery(ORDER_SELECT_LEGACY).eq("id", id).single();
  if (error) throw error;
  return data as unknown as ServiceOrder;
}

export function useOrders() {
  return useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
}

export function useOrder(id: string) {
  return useQuery({ queryKey: ["orders", id], queryFn: () => fetchOrder(id), enabled: !!id });
}

/**
 * Relê os lançamentos da OS e reescreve o resumo em service_orders
 * (total recebido, situação, forma e data), mantendo as telas que leem
 * payment_amount em sincronia com o histórico.
 */
async function syncOrderPaymentSummary(orderId: string) {
  const [{ data: payments }, { data: order }] = await Promise.all([
    supabase.from("order_payments").select("*").eq("order_id", orderId).order("paid_at", { ascending: true }),
    supabase.from("service_orders").select("*, values:order_values(*)").eq("id", orderId).single(),
  ]);

  const list = (payments ?? []) as OrderPayment[];
  const received = list.reduce((acc, p) => acc + Number(p.amount), 0);
  const total = sumValues(((order?.values ?? []) as OrderValue[]) ?? []);
  const status = received > 0 ? resolvePaymentStatus("paid", total, received) : "pending";
  const last = list[list.length - 1];

  const { error } = await supabase
    .from("service_orders")
    .update({
      payment_amount: received > 0 ? received : null,
      payment_status: status,
      payment_method: last?.method ?? null,
      payment_date: status === "paid" && last ? last.paid_at : null,
    })
    .eq("id", orderId);
  if (error) throw error;
}

export interface PaymentInput {
  orderId: string;
  amount: number;
  method?: PaymentMethod;
  paid_at?: string;
  notes?: string;
}

/**
 * Registra um valor recebido. Se a tabela de histórico ainda não existe,
 * apenas acumula no campo antigo para não travar o recebimento.
 */
export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, amount, method, paid_at, notes }: PaymentInput) => {
      const { error } = await supabase.from("order_payments").insert({
        order_id: orderId,
        amount,
        method,
        paid_at: paid_at ?? new Date().toISOString(),
        notes,
      });
      if (error) {
        paymentsTableAvailable = false;
        await addPaymentLegacy({ orderId, amount, method, paid_at });
        return;
      }
      paymentsTableAvailable = true;
      await syncOrderPaymentSummary(orderId);
    },
    onSuccess: (_, vars) => invalidateOrder(qc, vars.orderId),
  });
}

/** Caminho antigo: soma direto no acumulado de service_orders. */
async function addPaymentLegacy({ orderId, amount, method, paid_at }: PaymentInput) {
  const { data: order, error: readError } = await supabase
    .from("service_orders")
    .select("*, values:order_values(*)")
    .eq("id", orderId)
    .single();
  if (readError) throw readError;

  const received = Number(order.payment_amount ?? 0) + amount;
  const total = sumValues(((order.values ?? []) as OrderValue[]) ?? []);
  const status = resolvePaymentStatus("paid", total, received);
  const when = paid_at ?? new Date().toISOString();

  const { error } = await supabase
    .from("service_orders")
    .update({
      payment_amount: received,
      payment_status: status,
      payment_method: method ?? order.payment_method,
      payment_date: status === "paid" ? when : null,
    })
    .eq("id", orderId);
  if (error) throw error;
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orderId, amount, method, paid_at, notes }: PaymentInput & { id: string }) => {
      const { error } = await supabase
        .from("order_payments")
        .update({ amount, method, paid_at, notes })
        .eq("id", id);
      if (error) throw error;
      await syncOrderPaymentSummary(orderId);
    },
    onSuccess: (_, vars) => invalidateOrder(qc, vars.orderId),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orderId }: { id: string; orderId: string }) => {
      const { error } = await supabase.from("order_payments").delete().eq("id", id);
      if (error) throw error;
      await syncOrderPaymentSummary(orderId);
    },
    onSuccess: (_, vars) => invalidateOrder(qc, vars.orderId),
  });
}

/**
 * Sem a tabela de histórico não há lançamento para editar, então a correção
 * reescreve o acumulado direto na OS.
 */
export function useSetLegacyPaymentAmount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, amount, method, paid_at }: PaymentInput) => {
      const { data: order, error: readError } = await supabase
        .from("service_orders")
        .select("*, values:order_values(*)")
        .eq("id", orderId)
        .single();
      if (readError) throw readError;

      const total = sumValues(((order.values ?? []) as OrderValue[]) ?? []);
      const status = amount > 0 ? resolvePaymentStatus("paid", total, amount) : "pending";
      const { error } = await supabase
        .from("service_orders")
        .update({
          payment_amount: amount > 0 ? amount : null,
          payment_status: status,
          payment_method: method ?? order.payment_method,
          payment_date: status === "paid" ? paid_at ?? order.payment_date ?? new Date().toISOString() : null,
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => invalidateOrder(qc, vars.orderId),
  });
}

function invalidateOrder(qc: ReturnType<typeof useQueryClient>, orderId: string) {
  qc.invalidateQueries({ queryKey: ["orders"] });
  qc.invalidateQueries({ queryKey: ["orders", orderId] });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      values,
      ...order
    }: Omit<ServiceOrder, "id" | "user_id" | "created_at" | "client" | "messages" | "values"> & {
      values?: Omit<OrderValue, "id" | "order_id">[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: orderData, error } = await supabase
        .from("service_orders")
        .insert({ ...order, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      if (values && values.length > 0) {
        const { error: ve } = await supabase
          .from("order_values")
          .insert(values.map((v) => ({ ...v, order_id: orderData.id })));
        if (ve) throw ve;
      }
      return orderData;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values, ...order }: Omit<Partial<ServiceOrder>, "values"> & { id: string; values?: Omit<OrderValue, "id" | "order_id">[] }) => {
      const { data, error } = await supabase
        .from("service_orders")
        .update(order)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (values !== undefined) {
        await supabase.from("order_values").delete().eq("order_id", id);
        if (values.length > 0) {
          const { error: ve } = await supabase
            .from("order_values")
            .insert(values.map((v) => ({ ...v, order_id: id })));
          if (ve) throw ve;
        }
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", vars.id] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // As peças consumidas voltam para a prateleira: o cascade apagaria os
      // registros de uso sem repor o saldo do estoque.
      await restoreStockFromOrder(id);
      const { error } = await supabase.from("service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      content,
      type,
      file,
    }: {
      orderId: string;
      content?: string;
      type: "text" | "image";
      file?: File;
    }) => {
      let image_url: string | undefined;
      if (type === "image" && file) {
        const ext = file.name.split(".").pop();
        const path = `${orderId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("order-images")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("order-images").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
      const { error } = await supabase.from("order_messages").insert({
        order_id: orderId,
        content,
        type,
        image_url,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["orders", vars.orderId] }),
  });
}
