"use client";

import { useState } from "react";
import { Plus, Search, X, Package, Pencil, Trash2, Minus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useStockItems,
  useCreateStockItem,
  useUpdateStockItem,
  useDeleteStockItem,
  useAdjustStock,
} from "@/hooks/useStock";
import { matchesStockSearch, formatShelf } from "@/lib/search";
import type { StockItem } from "@/types";
import toast from "react-hot-toast";

/** "cap 100uf, capacitor" -> ["cap 100uf", "capacitor"] */
const parseAliases = (texto: string) =>
  texto.split(",").map((a) => a.trim()).filter(Boolean);

function ItemFormDialog({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item?: StockItem | null;
}) {
  const editing = !!item;
  const [name, setName] = useState(item?.name ?? "");
  const [aliases, setAliases] = useState((item?.aliases ?? []).join(", "));
  const [shelf, setShelf] = useState(item?.shelf ?? "");
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 0));
  const [notes, setNotes] = useState(item?.notes ?? "");

  const create = useCreateStockItem();
  const update = useUpdateStockItem();
  const salvando = create.isPending || update.isPending;

  const salvar = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do item");
      return;
    }
    const payload = {
      name: name.trim(),
      aliases: parseAliases(aliases),
      shelf: shelf || undefined,
      quantity: parseFloat(quantity) || 0,
      notes: notes.trim() || undefined,
    };
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Item atualizado" : "Item cadastrado");
        onClose();
      },
      onError: () => toast.error("Erro ao salvar o item"),
    };
    if (editing) update.mutate({ id: item.id, ...payload }, opts);
    else create.mutate(payload, opts);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>Item de estoque para uso interno</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Capacitor eletrolítico 100uF 50V" />
          </div>

          <div className="space-y-1.5">
            <Label>Apelidos</Label>
            <Input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="cap 100uf, eletrolítico, c100"
            />
            <p className="text-xs text-muted-foreground">
              Separe por vírgula. Serve para achar o item pelo nome que você usa no dia a dia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prateleira</Label>
              <Input
                value={shelf}
                onChange={(e) => setShelf(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onBlur={() => setShelf(formatShelf(shelf))}
                inputMode="numeric"
                placeholder="00012"
              />
              <p className="text-xs text-muted-foreground">5 dígitos</p>
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Para entrada/saída use os botões da lista.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Fornecedor, equivalências..." />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  item,
  kind,
  onClose,
}: {
  item: StockItem | null;
  kind: "in" | "out";
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("1");
  const adjust = useAdjustStock();
  const entrada = kind === "in";

  if (!item) return null;

  const qtd = parseFloat(amount) || 0;
  const resultado = item.quantity + (entrada ? qtd : -qtd);

  const confirmar = () => {
    if (qtd <= 0) {
      toast.error("Informe uma quantidade maior que zero");
      return;
    }
    adjust.mutate(
      { itemId: item.id, delta: entrada ? qtd : -qtd },
      {
        onSuccess: () => {
          toast.success(entrada ? "Entrada registrada" : "Saída registrada");
          onClose();
        },
        onError: () => toast.error("Erro ao movimentar o estoque"),
      }
    );
  };

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{entrada ? "Entrada no estoque" : "Saída do estoque"}</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Quantidade atual</span>
            <span className="font-medium">{item.quantity}</span>
          </div>
          <div className="space-y-1.5">
            <Label>{entrada ? "Quantidade que entrou" : "Quantidade que saiu"}</Label>
            <Input type="number" step="1" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {qtd > 0 && (
              <p className={`text-xs ${resultado < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                Fica com {resultado}
                {resultado < 0 && " — saldo negativo"}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={confirmar} disabled={adjust.isPending}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [moving, setMoving] = useState<{ item: StockItem; kind: "in" | "out" } | null>(null);

  const { data: items, isLoading, error } = useStockItems();
  const remove = useDeleteStockItem();

  const searching = search.trim() !== "";
  const filtrados = (items ?? []).filter((i) => matchesStockSearch(i, search));

  const excluir = (item: StockItem) => {
    if (!confirm(`Excluir "${item.name}" do estoque?`)) return;
    remove.mutate(item.id, {
      onSuccess: () => toast.success("Item excluído"),
      onError: () => toast.error("Erro ao excluir"),
    });
  };

  const abrirNovo = () => { setEditing(null); setFormOpen(true); };
  const abrirEdicao = (item: StockItem) => { setEditing(item); setFormOpen(true); };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">Estoque</h1>
            <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-1" />Novo item</Button>
          </div>

          {error && (
            <Card className="border-amber-200 dark:border-amber-900/50">
              <CardContent className="p-4 space-y-1">
                <p className="font-medium text-amber-700 dark:text-amber-400">Estoque ainda não configurado</p>
                <p className="text-sm text-muted-foreground">
                  Rode a migração <code className="font-mono">003_stock.sql</code> no SQL Editor do Supabase
                  para criar as tabelas do estoque.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-9"
              placeholder="Buscar por nome, apelido ou prateleira..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
            </div>
          )}

          {!isLoading && !error && filtrados.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <Package className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">{searching ? "Nenhum item encontrado" : "Estoque vazio"}</p>
              <p className="text-sm text-muted-foreground">
                {searching ? "Tente pelo apelido ou pelo número da prateleira" : "Cadastre o primeiro item"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {filtrados.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      {item.shelf && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                          Prateleira {item.shelf}
                        </span>
                      )}
                    </div>
                    {item.aliases.length > 0 && (
                      <p className="text-xs text-muted-foreground">{item.aliases.join(" · ")}</p>
                    )}
                    {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Qtd</p>
                      <p className={`text-lg font-bold ${item.quantity < 0 ? "text-destructive" : item.quantity === 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                        {item.quantity}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" title="Entrada" onClick={() => setMoving({ item, kind: "in" })}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" title="Saída" onClick={() => setMoving({ item, kind: "out" })}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => abrirEdicao(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Excluir" onClick={() => excluir(item)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtrados.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3" />
              A baixa por OS acontece na própria ordem de serviço, na seção de itens utilizados.
            </p>
          )}
        </div>

        {formOpen && (
          <ItemFormDialog
            key={editing?.id ?? "novo"}
            open={formOpen}
            onClose={() => setFormOpen(false)}
            item={editing}
          />
        )}
        <MoveDialog
          key={moving ? `${moving.item.id}-${moving.kind}` : "none"}
          item={moving?.item ?? null}
          kind={moving?.kind ?? "in"}
          onClose={() => setMoving(null)}
        />
      </AppLayout>
    </AuthGuard>
  );
}
