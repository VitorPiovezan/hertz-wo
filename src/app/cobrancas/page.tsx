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
import { formatCurrency, formatDate, formatRelative } from "@/lib/utils";
import type { PaymentMethod, ServiceOrder } from "@/types";
import toast from "react-hot-toast";

function MarkPaidModal({
  order,
  onClose,
}: {
  order: ServiceOrder | null;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [amount, setAmount] = useState(String(order?.payment_amount ?? sumValuesLocal(order)));
  const update = useUpdateOrder();

  function sumValuesLocal(o: ServiceOrder | null) {
    return o?.values?.reduce((acc, v) => acc + Number(v.amount), 0) ?? 0;
  }

  const handleConfirm = () => {
    if (!order) return;
    update.mutate(
      {
        id: order.id,
        payment_status: "paid",
        payment_method: method,
        payment_amount: parseFloat(amount) || undefined,
        payment_date: new Date().toISOString(),
      },
      {
        onSuccess: () => { toast.success("Pagamento registrado"); onClose(); },
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
            <Label>Valor Recebido</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
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

  const totalPending = pending.reduce((acc, o) => {
    const orderTotal = o.values?.reduce((s, v) => s + Number(v.amount), 0) ?? 0;
    return acc + (o.payment_amount ?? orderTotal);
  }, 0);

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
              const total = o.values?.reduce((acc, v) => acc + Number(v.amount), 0) ?? 0;
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
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatCurrency(total)}</p>
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

        <MarkPaidModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      </AppLayout>
    </AuthGuard>
  );
}
