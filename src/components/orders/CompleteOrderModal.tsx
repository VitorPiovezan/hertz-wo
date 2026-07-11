"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentMethod, PaymentStatus } from "@/types";

const schema = z.object({
  payment_status: z.enum(["paid", "pending"]),
  payment_method: z.enum(["pix", "card", "cash"]).optional(),
  payment_amount: z.string().optional(),
  payment_notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    payment_status: PaymentStatus;
    payment_method?: PaymentMethod;
    payment_amount?: number;
    payment_notes?: string;
    payment_date?: string;
  }) => void;
  defaultTotal?: number;
}

export function CompleteOrderModal({ open, onClose, onConfirm, defaultTotal }: Props) {
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      payment_status: "paid",
      payment_amount: defaultTotal ? String(defaultTotal) : "",
    },
  });

  const paymentStatus = watch("payment_status");

  const handleFormSubmit = (data: FormData) => {
    onConfirm({
      payment_status: data.payment_status,
      payment_method: data.payment_status === "paid" ? data.payment_method : undefined,
      payment_amount: data.payment_status === "paid" && data.payment_amount
        ? parseFloat(data.payment_amount) : undefined,
      payment_notes: data.payment_notes,
      payment_date: data.payment_status === "paid" ? new Date().toISOString() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir Ordem de Serviço</DialogTitle>
          <DialogDescription>Registre o pagamento desta ordem</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Situação do Pagamento</Label>
            <Select onValueChange={(v: string | null) => setValue("payment_status", (v ?? "paid") as PaymentStatus)} defaultValue="paid">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Aguardando Pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentStatus === "paid" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Forma de Pagamento</Label>
                  <Select onValueChange={(v: string | null) => setValue("payment_method", (v ?? "pix") as PaymentMethod)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor Recebido</Label>
                  <Input
                    {...register("payment_amount")}
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea {...register("payment_notes")} placeholder="Notas sobre o pagamento..." rows={2} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Confirmar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
