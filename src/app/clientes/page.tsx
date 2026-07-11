"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Phone, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClientForm } from "@/components/clients/ClientForm";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { maskPhone } from "@/lib/utils";
import type { Client } from "@/types";
import toast from "react-hot-toast";

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const { data: clients, isLoading } = useClients();
  const create = useCreateClient();
  const update = useUpdateClient();
  const remove = useDeleteClient();

  const filtered = clients?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_primary.includes(search)
  );

  const handleSubmit = (data: Omit<Client, "id" | "user_id" | "created_at">) => {
    if (editing) {
      update.mutate({ id: editing.id, ...data }, {
        onSuccess: () => { toast.success("Cliente atualizado"); setFormOpen(false); setEditing(null); },
        onError: () => toast.error("Erro ao atualizar cliente"),
      });
    } else {
      create.mutate(data, {
        onSuccess: () => { toast.success("Cliente criado"); setFormOpen(false); },
        onError: () => toast.error("Erro ao criar cliente"),
      });
    }
  };

  const handleDelete = (c: Client) => {
    if (!confirm(`Excluir "${c.name}"?`)) return;
    remove.mutate(c.id, {
      onSuccess: () => toast.success("Cliente excluído"),
      onError: () => toast.error("Erro ao excluir"),
    });
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Clientes</h1>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Cliente
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading && (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
          )}

          {!isLoading && filtered?.length === 0 && (
            <p className="text-center text-muted-foreground py-10">Nenhum cliente encontrado</p>
          )}

          <div className="space-y-2">
            {filtered?.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>{maskPhone(c.phone_primary)}</span>
                    </div>
                    {c.address && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.address}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}>
          <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <ClientForm
              defaultValues={editing ?? undefined}
              onSubmit={handleSubmit}
              loading={create.isPending || update.isPending}
            />
          </DialogContent>
        </Dialog>
      </AppLayout>
    </AuthGuard>
  );
}
