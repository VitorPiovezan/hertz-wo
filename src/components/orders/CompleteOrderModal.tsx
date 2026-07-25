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
    /** Valor recebido AGORA — vira um lançamento novo, não substitui os anteriores. */
    payment_amount?: number;
    payment_notes?: string;
    payment_date?: string;
  }) => void;
  defaultTotal?: number;
  /** Adiantamentos já registrados nesta OS. */
  alreadyReceived?: number;
}

export function CompleteOrderModal({
  open,
  onClose,
  onConfirm,
  defaultTotal,
  alreadyReceived = 0,
}: Props) {
  const total = defaultTotal ?? 0;
  const openBalance = remainingBalance(total, alreadyReceived);

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: { payment_status: "paid", payment_amount: openBalance ? String(openBalance) : "" },
  });

  // O total e os adiantamentos só são conhecidos depois que a OS carrega.
  // Já sugere o saldo em aberto, não o valor cheio da OS.
  useEffect(() => {
    if (open) {
      reset({ payment_status: "paid", payment_amount: openBalance ? String(openBalance) : "" });
    }
  }, [open, openBalance, reset]);

  const intendedStatus = watch("payment_status");
  const receivingNow = parseFloat(watch("payment_amount") ?? "") || 0;
  const totalReceived = alreadyReceived + receivingNow;
  const balance = remainingBalance(total, totalReceived);
  const finalStatus = resolvePaymentStatus(intendedStatus, total, totalReceived);
  const isPartial = intendedStatus === "paid" && finalStatus === "pending";

  const handleFormSubmit = (data: FormData) => {
    const amountNow = parseFloat(data.payment_amount ?? "") || 0;
    const status = resolvePaymentStatus(data.payment_status, total, alreadyReceived + amountNow);
    onConfirm({
      payment_status: status,
      payment_method: amountNow > 0 ? data.payment_method : undefined,
      payment_amount: amountNow > 0 ? amountNow : undefined,
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
          <DialogDescription>
            {alreadyReceived > 0
              ? "Registre o valor recebido agora — os adiantamentos já entram no cálculo"
              : "Registre o pagamento desta ordem"}
          </DialogDescription>
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
              <Label>Valor Recebido Agora</Label>
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
              {alreadyReceived > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Já adiantado</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(alreadyReceived)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recebendo agora</span>
                <span className="font-medium">{formatCurrency(receivingNow)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo restante</span>
                <span className={balance > 0 ? "font-medium text-amber-600 dark:text-amber-400" : "font-medium text-green-600 dark:text-green-400"}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          )}

          {isPartial && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              O total recebido ainda é menor que o valor da OS. Ela será concluída como{" "}
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
