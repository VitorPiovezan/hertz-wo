"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ArrowLeft, Pencil, Trash2, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { OrderStatusBadge, PaymentStatusBadge, DeadlineBadge } from "@/components/orders/StatusBadge";
import { OrderForm } from "@/components/orders/OrderForm";
import { OrderChat } from "@/components/orders/OrderChat";
import { CompleteOrderModal } from "@/components/orders/CompleteOrderModal";
import { useOrders, useOrder, useUpdateOrder, useDeleteOrder } from "@/hooks/useOrders";
import { formatCurrency, formatDate, formatRelative, sumValues, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types";
import toast from "react-hot-toast";

const STATUS_FLOW: OrderStatus[] = ["pending", "in_review", "in_progress", "completed"];

function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const { data: order, isLoading } = useOrder(id);
  const update = useUpdateOrder();
  const remove = useDeleteOrder();
  const router = useRouter();

  const total = sumValues(order?.values ?? []);
  const nextStatus = order ? STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] : null;

  const handleStatusChange = (status: OrderStatus) => {
    if (status === "completed") { setCompleteOpen(true); return; }
    update.mutate({ id, status }, {
      onSuccess: () => toast.success("Status atualizado"),
      onError: () => toast.error("Erro ao atualizar status"),
    });
  };

  const handleComplete = (paymentData: { payment_status: PaymentStatus; payment_method?: PaymentMethod; payment_amount?: number; payment_notes?: string; payment_date?: string }) => {
    update.mutate({ id, status: "completed", ...paymentData }, {
      onSuccess: () => { toast.success("OS concluída"); setCompleteOpen(false); },
      onError: () => toast.error("Erro ao concluir OS"),
    });
  };

  const handleDelete = () => {
    if (!confirm("Excluir esta ordem de serviço?")) return;
    remove.mutate(id, {
      onSuccess: () => { toast.success("OS excluída"); onBack(); },
      onError: () => toast.error("Erro ao excluir"),
    });
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>;
  if (!order) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold truncate">{order.equipment_name}</h2>
            <OrderStatusBadge status={order.status} />
            {order.status === "completed" && order.payment_status && <PaymentStatusBadge status={order.payment_status} />}
            {order.deadline && <DeadlineBadge deadline={order.deadline} />}
          </div>
          <p className="text-sm text-muted-foreground">{formatRelative(order.created_at)}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={handleDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      {/* Status flow */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange(s)}
                  disabled={STATUS_FLOW.indexOf(order.status) >= i}
                  className={`text-xs rounded-full font-medium transition-all ${order.status === s ? "ring-2 ring-primary ring-offset-1" : STATUS_FLOW.indexOf(order.status) > i ? "opacity-40 cursor-default" : "hover:opacity-80 cursor-pointer"}`}
                >
                  <OrderStatusBadge status={s} />
                </button>
                {i < STATUS_FLOW.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
          {nextStatus && order.status !== "completed" && (
            <Button size="sm" className="mt-3" onClick={() => handleStatusChange(nextStatus)} disabled={update.isPending}>
              Avançar para {ORDER_STATUS_LABELS[nextStatus]}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.client && <div><span className="text-muted-foreground">Cliente: </span>{order.client.name}</div>}
            <div><span className="text-muted-foreground">Manutenção: </span>{order.maintenance_type}</div>
            {order.deadline && <div><span className="text-muted-foreground">Prazo: </span>{formatDate(order.deadline)}</div>}
            {order.notes && <div><span className="text-muted-foreground">Obs: </span>{order.notes}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Valores</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {order.values?.map((v) => (
              <div key={v.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{v.label}</span>
                <span className="font-medium">{formatCurrency(v.amount)}</span>
              </div>
            ))}
            {(order.values?.length ?? 0) > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </>
            )}
            {order.status === "completed" && order.payment_status && (
              <div className="pt-1 space-y-1">
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento</span>
                  <PaymentStatusBadge status={order.payment_status} />
                </div>
                {order.payment_method && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Forma</span>
                    <span>{PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}</span>
                  </div>
                )}
                {order.payment_amount && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Recebido</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(order.payment_amount)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Atualizações e Fotos</CardTitle></CardHeader>
        <CardContent>
          <OrderChat orderId={id} messages={order.messages ?? []} />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto">
          <DialogHeader><DialogTitle>Editar OS</DialogTitle></DialogHeader>
          <OrderForm
            defaultValues={{ ...order, values: order.values }}
            onSubmit={(data) => {
              update.mutate({ id, ...data } as Parameters<typeof update.mutate>[0], {
                onSuccess: () => { toast.success("OS atualizada"); setEditOpen(false); },
                onError: () => toast.error("Erro ao atualizar"),
              });
            }}
            loading={update.isPending}
          />
        </DialogContent>
      </Dialog>

      <CompleteOrderModal open={completeOpen} onClose={() => setCompleteOpen(false)} onConfirm={handleComplete} defaultTotal={total} />
    </div>
  );
}

const STATUS_BADGE_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "in_review", label: "Em Aprovação" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "completed", label: "Concluída" },
];

function OrdersList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: orders, isLoading } = useOrders();

  const hasDateFilter = dateFrom || dateTo;

  const filtered = orders?.filter((o) => {
    const matchSearch =
      o.equipment_name.toLowerCase().includes(search.toLowerCase()) ||
      o.maintenance_type.toLowerCase().includes(search.toLowerCase()) ||
      (o.client?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const created = new Date(o.created_at);
    const matchFrom = !dateFrom || created >= new Date(dateFrom);
    const matchTo = !dateTo || created <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  const clearDateFilter = () => { setDateFrom(""); setDateTo(""); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ordens de Serviço</h1>
        <Link href="/ordens/nova"><Button><Plus className="h-4 w-4 mr-1" />Nova OS</Button></Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar equipamento, cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_BADGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 text-sm" placeholder="De" />
        <span className="text-muted-foreground text-sm">até</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 text-sm" placeholder="Até" />
        {hasDateFilter && (
          <Button variant="ghost" size="icon" onClick={clearDateFilter} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>}
      {!isLoading && filtered?.length === 0 && <p className="text-center text-muted-foreground py-10">Nenhuma ordem encontrada</p>}

      <div className="space-y-2">
        {filtered?.map((o) => {
          const total = sumValues(o.values ?? []);
          return (
            <Card key={o.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(o.id)}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{o.equipment_name}</p>
                    <OrderStatusBadge status={o.status} />
                    {o.status === "completed" && o.payment_status && <PaymentStatusBadge status={o.payment_status} />}
                    {o.deadline && <DeadlineBadge deadline={o.deadline} />}
                  </div>
                  <p className="text-sm text-muted-foreground">{o.maintenance_type}</p>
                  {o.client && <p className="text-xs text-muted-foreground">{o.client.name}</p>}
                </div>
                {total > 0 && <span className="text-sm font-semibold shrink-0">{formatCurrency(total)}</span>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { Suspense } from "react";

function OrdensPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get("id");

  const handleSelect = (id: string) => router.push(`?id=${id}`);
  const handleBack = () => router.push("/ordens");

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          {selectedId
            ? <OrderDetail id={selectedId} onBack={handleBack} />
            : <OrdersList onSelect={handleSelect} />
          }
        </div>
      </AppLayout>
    </AuthGuard>
  );
}

export default function OrdensPage() {
  return (
    <Suspense>
      <OrdensPageInner />
    </Suspense>
  );
}
