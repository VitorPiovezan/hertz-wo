"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ArrowLeft, Pencil, Trash2, Download, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { BudgetStatusBadge } from "@/components/orders/StatusBadge";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { useBudget, useBudgets, useUpdateBudget, useDeleteBudget } from "@/hooks/useBudgets";
import { useCreateOrder } from "@/hooks/useOrders";
import { formatCurrency, formatDate, formatRelative, sumValues } from "@/lib/utils";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const BudgetPDFDownload = dynamic(() => import("@/components/budgets/BudgetPDF").then(m => ({ default: m.BudgetPDFDownload })), { ssr: false });

function BudgetDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: budget, isLoading } = useBudget(id);
  const update = useUpdateBudget();
  const remove = useDeleteBudget();
  const createOrder = useCreateOrder();
  const router = useRouter();

  const total = sumValues(budget?.items ?? []);

  const handleCreateOS = () => {
    if (!budget) return;
    createOrder.mutate(
      {
        client_id: budget.client_id ?? undefined,
        equipment_name: budget.equipment_name,
        maintenance_type: "Conforme orçamento",
        status: "pending",
        notes: budget.notes ?? undefined,
        values: budget.items?.map((i) => ({ label: i.label, amount: i.amount })) ?? [],
      } as Parameters<typeof createOrder.mutate>[0],
      {
        onSuccess: (o) => { toast.success("OS criada"); router.push(`/ordens?id=${o.id}`); },
        onError: () => toast.error("Erro ao criar OS"),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Excluir este orçamento?")) return;
    remove.mutate(id, {
      onSuccess: () => { toast.success("Orçamento excluído"); onBack(); },
      onError: () => toast.error("Erro ao excluir"),
    });
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}</div>;
  if (!budget) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold truncate">{budget.equipment_name}</h2>
            <BudgetStatusBadge status={budget.status} />
          </div>
          <p className="text-sm text-muted-foreground">{formatRelative(budget.created_at)}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={handleDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleCreateOS} disabled={createOrder.isPending}>
          <ClipboardList className="h-4 w-4 mr-1" /> Criar OS
        </Button>
        <BudgetPDFDownload budget={budget} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {budget.client && <div><span className="text-muted-foreground">Cliente: </span>{budget.client.name}</div>}
          <div><span className="text-muted-foreground">Data: </span>{formatDate(budget.created_at)}</div>
          {budget.notes && <div><span className="text-muted-foreground">Obs: </span>{budget.notes}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Itens</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {budget.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          {(budget.items?.length ?? 0) > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Orçamento</DialogTitle></DialogHeader>
          <BudgetForm
            defaultValues={{ ...budget, items: budget.items }}
            onSubmit={(data) => {
              const payload = { id, ...data } as Parameters<typeof update.mutate>[0];
              update.mutate(payload, {
                onSuccess: () => { toast.success("Orçamento atualizado"); setEditOpen(false); },
                onError: () => toast.error("Erro ao atualizar"),
              });
            }}
            loading={update.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetsList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: budgets, isLoading } = useBudgets();

  const filtered = budgets?.filter((b) =>
    b.equipment_name.toLowerCase().includes(search.toLowerCase()) ||
    b.client?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Orçamentos</h1>
        <Link href="/orcamentos/novo"><Button><Plus className="h-4 w-4 mr-1" />Novo</Button></Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar equipamento, cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>}
      {!isLoading && filtered?.length === 0 && <p className="text-center text-muted-foreground py-10">Nenhum orçamento encontrado</p>}

      <div className="space-y-2">
        {filtered?.map((b) => {
          const total = sumValues(b.items ?? []);
          return (
            <Card key={b.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(b.id)}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{b.equipment_name}</p>
                    <BudgetStatusBadge status={b.status} />
                  </div>
                  {b.client && <p className="text-sm text-muted-foreground">{b.client.name}</p>}
                  <p className="text-xs text-muted-foreground">{formatDate(b.created_at)}</p>
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

function OrcamentosPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get("id");

  const handleSelect = (id: string) => router.push(`?id=${id}`);
  const handleBack = () => router.push("/orcamentos");

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          {selectedId
            ? <BudgetDetail id={selectedId} onBack={handleBack} />
            : <BudgetsList onSelect={handleSelect} />
          }
        </div>
      </AppLayout>
    </AuthGuard>
  );
}

export default function OrcamentosPage() {
  return (
    <Suspense>
      <OrcamentosPageInner />
    </Suspense>
  );
}
