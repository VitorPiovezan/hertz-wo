"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, remainingBalance, resolvePaymentStatus } from "@/lib/utils";
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
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      payment_status: "paid",
      payment_amount: defaultTotal ? String(defaultTotal) : "",
    },
  });

  // O total só é conhecido depois que a OS carrega (e muda se os valores forem editados).
  useEffect(() => {
    if (open) reset({ payment_status: "paid", payment_amount: defaultTotal ? String(defaultTotal) : "" });
  }, [open, defaultTotal, reset]);

  const total = defaultTotal ?? 0;
  const intendedStatus = watch("payment_status");
  const received = parseFloat(watch("payment_amount") ?? "") || 0;
  const balance = remainingBalance(total, received);
  const finalStatus = resolvePaymentStatus(intendedStatus, total, received);
  const isPartial = intendedStatus === "paid" && finalStatus === "pending";

  const handleFormSubmit = (data: FormData) => {
    const amount = parseFloat(data.payment_amount ?? "") || 0;
    const status = resolvePaymentStatus(data.payment_status, total, amount);
    onConfirm({
      payment_status: status,
      payment_method: amount > 0 ? data.payment_method : undefined,
      payment_amount: amount > 0 ? amount : undefined,
      payment_notes: data.payment_notes,
      // Data do pagamento só faz sentido quando a OS foi realmente quitada.
      payment_date: status === "paid" ? new Date().toISOString() : undefined,
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
            <Select
              value={intendedStatus}
              onValueChange={(v: string | null) => setValue("payment_status", (v ?? "paid") as PaymentStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Aguardando Pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Forma de Pagamento</Label>
              <Select
                value={watch("payment_method") ?? null}
                onValueChange={(v: string | null) => setValue("payment_method", (v ?? "pix") as PaymentMethod)}
              >
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
              <Label>{intendedStatus === "paid" ? "Valor Recebido" : "Entrada Recebida"}</Label>
              <Input
                {...register("payment_amount")}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
              />
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total da OS</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recebido</span>
                <span className="font-medium">{formatCurrency(received)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo restante</span>
                <span className={balance > 0 ? "font-medium text-orange-600 dark:text-orange-400" : "font-medium text-green-600 dark:text-green-400"}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          )}

          {isPartial && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              O valor recebido é menor que o total da OS. Ela será concluída como{" "}
              <strong>Aguardando Pagamento</strong> e ficará em Cobranças até quitar o saldo de{" "}
              {formatCurrency(balance)}.
            </p>
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
