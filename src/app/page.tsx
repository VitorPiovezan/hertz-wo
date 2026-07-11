"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LayoutList, LayoutDashboard, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { OrderStatusBadge, PaymentStatusBadge, BudgetStatusBadge, DeadlineBadge } from "@/components/orders/StatusBadge";
import { useOrders, useUpdateOrder } from "@/hooks/useOrders";
import { useBudgets } from "@/hooks/useBudgets";
import { useCreateOrder } from "@/hooks/useOrders";
import { useViewStore } from "@/store";
import { formatDate, formatCurrency, sumValues, ORDER_STATUS_LABELS } from "@/lib/utils";
import type { ServiceOrder, OrderStatus } from "@/types";
import toast from "react-hot-toast";

const ORDER_STATUSES: OrderStatus[] = ["pending", "in_review", "in_progress", "completed"];
const STATUS_FLOW: OrderStatus[] = ["pending", "in_review", "in_progress", "completed"];

const FILTER_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "in_review", label: "Em Aprovação" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "completed", label: "Concluída" },
  { value: "budget", label: "Orçamentos" },
];

function StatsCards() {
  const { data: orders } = useOrders();
  const openOrders = orders?.filter((o) => o.status !== "completed") ?? [];
  const inProgress = orders?.filter((o) => o.status === "in_progress") ?? [];
  const completedPending = orders?.filter((o) => o.status === "completed" && o.payment_status !== "paid") ?? [];
  const totalRevenue = orders
    ?.filter((o) => o.payment_status === "paid")
    .reduce((acc, o) => acc + (o.payment_amount ?? 0), 0) ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "OSs Abertas", value: openOrders.length, color: "text-blue-600 dark:text-blue-400" },
        { label: "Em Andamento", value: inProgress.length, color: "text-amber-600 dark:text-amber-400" },
        { label: "Aguardando Pagamento", value: completedPending.length, color: "text-orange-600 dark:text-orange-400" },
        { label: "Receita Recebida", value: formatCurrency(totalRevenue), color: "text-green-600 dark:text-green-400" },
      ].map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusFilterBadges({ filters, onToggle, onClear }: { filters: string[]; onToggle: (v: string) => void; onClear: () => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={onClear}
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
          filters.length === 0
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-muted-foreground border-border hover:bg-muted"
        }`}
      >
        Todos
      </button>
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onToggle(opt.value)}
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
            filters.includes(opt.value)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function OrderAccordion({ order }: { order: ServiceOrder }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateOrder();
  const total = sumValues(order.values ?? []);
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextStatus = STATUS_FLOW[currentIndex + 1] ?? null;
  const prevStatus = STATUS_FLOW[currentIndex - 1] ?? null;

  const advance = () => {
    if (!nextStatus) return;
    update.mutate({ id: order.id, status: nextStatus }, {
      onSuccess: () => toast.success(`Status: ${ORDER_STATUS_LABELS[nextStatus]}`),
      onError: () => toast.error("Erro ao atualizar status"),
    });
  };

  const goBack = () => {
    if (!prevStatus) return;
    update.mutate({ id: order.id, status: prevStatus }, {
      onSuccess: () => toast.success(`Status: ${ORDER_STATUS_LABELS[prevStatus]}`),
      onError: () => toast.error("Erro ao atualizar status"),
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{order.equipment_name}</span>
          <OrderStatusBadge status={order.status} />
          {order.status === "completed" && order.payment_status && (
            <PaymentStatusBadge status={order.payment_status} />
          )}
          {order.deadline && <DeadlineBadge deadline={order.deadline} />}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {total > 0 && <span className="text-sm font-medium text-muted-foreground">{formatCurrency(total)}</span>}
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 border-t bg-muted/20 space-y-2">
          {order.client && <p className="text-sm"><span className="text-muted-foreground">Cliente: </span>{order.client.name}</p>}
          <p className="text-sm"><span className="text-muted-foreground">Manutenção: </span>{order.maintenance_type}</p>
          {order.deadline && <p className="text-sm"><span className="text-muted-foreground">Prazo: </span>{formatDate(order.deadline)}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/ordens?id=${order.id}`}>
              <Button size="sm" variant="outline">Ver detalhes</Button>
            </Link>
            {prevStatus && (
              <Button size="sm" variant="ghost" onClick={goBack} disabled={update.isPending}>
                ← {ORDER_STATUS_LABELS[prevStatus]}
              </Button>
            )}
            {nextStatus && (
              <Button size="sm" onClick={advance} disabled={update.isPending}>
                {ORDER_STATUS_LABELS[nextStatus]} →
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ListView({ filters }: { filters: string[] }) {
  const router = useRouter();
  const { data: orders, isLoading: lo } = useOrders();
  const { data: budgets, isLoading: lb } = useBudgets();
  const createOrder = useCreateOrder();

  const noFilter = filters.length === 0;
  const orderStatuses = filters.filter((f) => f !== "budget");
  const showBudgets = noFilter || filters.includes("budget");
  const showOrders = noFilter || orderStatuses.length > 0;

  const filteredOrders = orders?.filter((o) =>
    noFilter || orderStatuses.length === 0 ? true : orderStatuses.includes(o.status)
  ) ?? [];

  const handleCreateOS = (b: NonNullable<typeof budgets>[0]) => {
    if (!confirm(`Criar OS a partir do orçamento "${b.equipment_name}"?`)) return;
    createOrder.mutate(
      {
        client_id: b.client_id ?? undefined,
        equipment_name: b.equipment_name,
        maintenance_type: "Conforme orçamento",
        status: "pending",
        notes: b.notes ?? undefined,
        values: b.items?.map((i) => ({ label: i.label, amount: i.amount })) ?? [],
      } as Parameters<typeof createOrder.mutate>[0],
      {
        onSuccess: (o) => { toast.success("OS criada"); router.push(`/ordens?id=${o.id}`); },
        onError: () => toast.error("Erro ao criar OS"),
      }
    );
  };

  if (lo || lb) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {showOrders && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ordens de Serviço</h2>
          {filteredOrders.length === 0
            ? <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma ordem de serviço</p>
            : <div className="space-y-1.5">{filteredOrders.map((o) => <OrderAccordion key={o.id} order={o} />)}</div>
          }
        </div>
      )}

      {showBudgets && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Orçamentos</h2>
          {(budgets?.length ?? 0) === 0
            ? <p className="text-sm text-muted-foreground py-6 text-center">Nenhum orçamento ainda</p>
            : (
              <div className="space-y-1.5">
                {budgets?.map((b) => (
                  <div key={b.id} className="border rounded-lg flex items-center justify-between px-4 py-3 gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{b.equipment_name}</span>
                      <BudgetStatusBadge status={b.status} />
                      {b.client && <span className="text-xs text-muted-foreground">{b.client.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.items && b.items.length > 0 && (
                        <span className="text-sm font-medium text-muted-foreground">{formatCurrency(sumValues(b.items))}</span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateOS(b)}
                        disabled={createOrder.isPending}
                        className="text-xs"
                      >
                        + OS
                      </Button>
                      <Link href={`/orcamentos?id=${b.id}`}><Button size="sm" variant="ghost">Ver</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}

function KanbanOrderCard({ order }: { order: ServiceOrder }) {
  const update = useUpdateOrder();
  const total = sumValues(order.values ?? []);
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextStatus = STATUS_FLOW[currentIndex + 1] ?? null;

  const advance = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nextStatus) return;
    update.mutate({ id: order.id, status: nextStatus }, {
      onSuccess: () => toast.success(`Status: ${ORDER_STATUS_LABELS[nextStatus]}`),
      onError: () => toast.error("Erro ao atualizar status"),
    });
  };

  return (
    <Link href={`/ordens?id=${order.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-medium leading-tight">{order.equipment_name}</p>
          {order.client && <p className="text-xs text-muted-foreground">{order.client.name}</p>}
          <p className="text-xs text-muted-foreground">{order.maintenance_type}</p>
          <div className="flex flex-wrap gap-1">
            {order.deadline && <DeadlineBadge deadline={order.deadline} />}
            {order.status === "completed" && order.payment_status && (
              <PaymentStatusBadge status={order.payment_status} />
            )}
          </div>
          {total > 0 && <p className="text-sm font-semibold">{formatCurrency(total)}</p>}
          {nextStatus && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={advance}
              disabled={update.isPending}
            >
              → {ORDER_STATUS_LABELS[nextStatus]}
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function KanbanView({ filters }: { filters: string[] }) {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  const orderStatuses = filters.filter((f) => f !== "budget");
  const visibleStatuses = ORDER_STATUSES.filter((status) => {
    if (filters.length === 0 || (filters.includes("budget") && orderStatuses.length === 0)) return true;
    return orderStatuses.includes(status);
  });

  return (
    <div className={`grid gap-3 ${visibleStatuses.length === 1 ? "grid-cols-1 max-w-sm" : visibleStatuses.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
      {visibleStatuses.map((status) => {
        const cols = orders?.filter((o) => o.status === status) ?? [];
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{ORDER_STATUS_LABELS[status]}</h3>
              <Badge variant="secondary" className="text-xs">{cols.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[4rem]">
              {cols.map((order) => <KanbanOrderCard key={order.id} order={order} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const { homeView, setHomeView, homeStatusFilters, toggleHomeStatusFilter, clearHomeStatusFilters } = useViewStore();

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">Início</h1>
            <div className="flex items-center gap-2">
              <Link href="/ordens/nova">
                <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Nova OS</Button>
              </Link>
              <Link href="/orcamentos/novo">
                <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Orçamento</Button>
              </Link>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${homeView === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setHomeView("list")}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${homeView === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setHomeView("kanban")}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <StatsCards />

          <StatusFilterBadges filters={homeStatusFilters} onToggle={toggleHomeStatusFilter} onClear={clearHomeStatusFilters} />

          {homeView === "list"
            ? <ListView filters={homeStatusFilters} />
            : <KanbanView filters={homeStatusFilters} />
          }
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
