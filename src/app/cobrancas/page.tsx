"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOrders, useUpdateOrder } from "@/hooks/useOrders";
import {
  formatCurrency,
  formatRelative,
  orderReceived,
  orderTotal,
  remainingBalance,
  resolvePaymentStatus,
} from "@/lib/utils";
import type { PaymentMethod, ServiceOrder } from "@/types";
import toast from "react-hot-toast";

function MarkPaidModal({
  order,
  onClose,
}: {
  order: ServiceOrder | null;
  onClose: () => void;
}) {
  const total = order ? orderTotal(order) : 0;
  const alreadyReceived = order ? orderReceived(order) : 0;
  const balance = remainingBalance(total, alreadyReceived);

  const [method, setMethod] = useState<PaymentMethod>("pix");
  // O modal é remontado por OS (key no pai), então parte sempre do saldo devedor atual.
  const [amount, setAmount] = useState(() => (balance > 0 ? String(balance) : ""));
  const update = useUpdateOrder();

  const amountNow = parseFloat(amount) || 0;
  const newReceived = alreadyReceived + amountNow;
  const newBalance = remainingBalance(total, newReceived);
  const newStatus = resolvePaymentStatus("paid", total, newReceived);

  const handleConfirm = () => {
    if (!order) return;
    if (amountNow <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    update.mutate(
      {
        id: order.id,
        payment_status: newStatus,
        payment_method: method,
        payment_amount: newReceived,
        payment_date: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(
            newStatus === "paid"
              ? "Pagamento quitado"
              : `Pagamento parcial registrado — saldo ${formatCurrency(newBalance)}`
          );
          onClose();
        },
        onError: () => toast.error("Erro ao registrar pagamento"),
      }
    );
  };

  if (!order) return null;

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>{order.equipment_name}{order.client ? ` — ${order.client.name}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total da OS</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Já recebido</span>
              <span className="font-medium">{formatCurrency(alreadyReceived)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo devedor</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(balance)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={(v: string | null) => setMethod((v ?? "pix") as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor Recebido Agora</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            {amountNow > 0 && (
              <p className={`text-xs ${newStatus === "paid" ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                {newStatus === "paid"
                  ? "OS será marcada como Paga."
                  : `Pagamento parcial — restam ${formatCurrency(newBalance)}. A OS continua Aguardando Pagamento.`}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={update.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CobrancasPage() {
  const { data: orders, isLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  const pending = orders
    ?.filter((o) => o.status === "completed" && o.payment_status !== "paid")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) ?? [];

  const totalPending = pending.reduce(
    (acc, o) => acc + remainingBalance(orderTotal(o), orderReceived(o)),
    0
  );

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Cobranças</h1>
            {pending.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total pendente</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalPending)}</p>
              </div>
            )}
          </div>

          {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>}

          {!isLoading && pending.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground">Nenhuma cobrança pendente</p>
            </div>
          )}

          <div className="space-y-2">
            {pending.map((o) => {
              const total = orderTotal(o);
              const received = orderReceived(o);
              const balance = remainingBalance(total, received);
              const completedDate = o.created_at;
              return (
                <Card key={o.id} className="border-orange-200 dark:border-orange-900/50">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{o.equipment_name}</p>
                      {o.client && <p className="text-sm text-muted-foreground">{o.client.name}</p>}
                      {o.client?.phone_primary && <p className="text-xs text-muted-foreground">{o.client.phone_primary}</p>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Concluída {formatRelative(completedDate)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatCurrency(balance)}</p>
                        {received > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            {formatCurrency(received)} de {formatCurrency(total)} recebido
                          </p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => setSelectedOrder(o)}>
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> Receber
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <MarkPaidModal key={selectedOrder?.id ?? "none"} order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      </AppLayout>
    </AuthGuard>
  );
}
