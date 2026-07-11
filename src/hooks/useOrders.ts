"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ServiceOrder, OrderValue, OrderMessage } from "@/types";

const ORDER_SELECT = `*, client:clients(*), values:order_values(*), messages:order_messages(*)`;

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ServiceOrder[];
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select(ORDER_SELECT)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as ServiceOrder;
    },
    enabled: !!id,
  });
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
      const { error } = await supabase.from("service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
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
