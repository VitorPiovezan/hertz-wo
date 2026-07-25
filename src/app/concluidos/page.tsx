"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, PackageCheck, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { ReceiptButton } from "@/components/orders/ReceiptPDF";
import { matchesOrderSearch, orderIdLabel } from "@/lib/search";
import { useOrders } from "@/hooks/useOrders";
import {
  formatCurrency,
  formatDate,
  isSettledOrder,
  orderReceived,
  orderTotal,
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import type { PaymentMethod, ServiceOrder } from "@/types";

/** Data em que a OS foi quitada; cai para a criação se o pagamento é anterior ao campo. */
function settledDate(order: ServiceOrder) {
  return order.payment_date ?? order.created_at;
}

export default function ConcluidosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: orders, isLoading } = useOrders();

  const hasDateFilter = dateFrom || dateTo;

  const settled = (orders ?? [])
    .filter(isSettledOrder)
    .filter((o) => {
      const matchSearch = matchesOrderSearch(o, search);
      const paidAt = new Date(settledDate(o));
      const matchFrom = !dateFrom || paidAt >= new Date(dateFrom);
      const matchTo = !dateTo || paidAt <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchFrom && matchTo;
    })
    .sort((a, b) => new Date(settledDate(b)).getTime() - new Date(settledDate(a)).getTime());

  const totalReceived = settled.reduce((acc, o) => acc + orderReceived(o), 0);

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">Serviços Concluídos</h1>
            {settled.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {settled.length} {settled.length === 1 ? "serviço" : "serviços"} · total recebido
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalReceived)}</p>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nº da OS, cliente ou equipamento..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 text-sm" />
            <span className="text-muted-foreground text-sm">até</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 text-sm" />
            {hasDateFilter && (
              <Button variant="ghost" size="icon" onClick={() => { setDateFrom(""); setDateTo(""); }} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>}

          {!isLoading && settled.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <PackageCheck className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">Nenhum serviço concluído e pago</p>
              <p className="text-sm text-muted-foreground">
                As OSs aparecem aqui assim que o valor total é recebido
              </p>
            </div>
          )}

          <div className="space-y-2">
            {settled.map((o) => (
              <Card
                key={o.id}
                className="border-green-200 dark:border-green-900/50 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/ordens?id=${o.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    {orderIdLabel(o) && <p className="text-[10px] text-muted-foreground font-mono">{orderIdLabel(o)}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{o.equipment_name}</p>
                      <PaymentStatusBadge status="paid" />
                    </div>
                    <p className="text-sm text-muted-foreground">{o.maintenance_type}</p>
                    {o.client && <p className="text-xs text-muted-foreground">{o.client.name}</p>}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Pago em {formatDate(settledDate(o))}
                        {o.payment_method ? ` · ${PAYMENT_METHOD_LABELS[o.payment_method as PaymentMethod]}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(orderReceived(o))}</p>
                      {orderTotal(o) > 0 && orderReceived(o) !== orderTotal(o) && (
                        <p className="text-[11px] text-muted-foreground">OS: {formatCurrency(orderTotal(o))}</p>
                      )}
                    </div>
                    <ReceiptButton order={o} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
