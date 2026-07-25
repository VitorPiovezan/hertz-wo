'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, X, Lock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  useStockItems,
  useOrderStockItems,
  useAddOrderStockItem,
  useUpdateOrderStockItem,
  useRemoveOrderStockItem,
} from '@/hooks/useStock';
import { matchesStockSearch } from '@/lib/search';
import type { OrderStockItem, StockItem } from '@/types';
import toast from 'react-hot-toast';

function UsageRow({ usage }: { usage: OrderStockItem }) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(usage.quantity));
  const update = useUpdateOrderStockItem();
  const remove = useRemoveOrderStockItem();

  const nome = usage.item?.name ?? usage.item_name ?? 'Item removido do estoque';
  const prateleira = usage.item?.shelf;

  const salvar = () => {
    const qtd = parseFloat(quantity);
    if (!qtd || qtd <= 0) {
      toast.error('Informe uma quantidade maior que zero');
      return;
    }
    update.mutate(
      { usage, quantity: qtd },
      {
        onSuccess: () => {
          toast.success('Quantidade atualizada');
          setEditing(false);
        },
        onError: () => toast.error('Erro ao atualizar'),
      },
    );
  };

  const excluir = () => {
    if (!confirm(`Remover ${nome} desta OS? A quantidade volta para o estoque.`)) return;
    remove.mutate(
      { usage },
      {
        onSuccess: () => toast.success('Item removido — quantidade devolvida ao estoque'),
        onError: () => toast.error('Erro ao remover'),
      },
    );
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className="flex-1 text-sm truncate">{nome}</span>
        <Input
          type="number"
          step="1"
          min="0"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="w-20 text-sm"
        />
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={salvar} disabled={update.isPending}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => { setQuantity(String(usage.quantity)); setEditing(false); }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <div className="flex-1 min-w-0">
        <span className="truncate">{nome}</span>
        {prateleira && (
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">Prat. {prateleira}</span>
        )}
      </div>
      <span className="font-medium">{Number(usage.quantity)}×</span>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
        Editar
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={excluir} disabled={remove.isPending}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

function AddUsage({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const { data: items } = useStockItems();
  const add = useAddOrderStockItem();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item usado
      </Button>
    );
  }

  // Sem termo digitado a lista fica curta de propósito, só para dar o ponto de partida.
  const resultados = (items ?? [])
    .filter(i => matchesStockSearch(i, search))
    .slice(0, search.trim() ? 8 : 5);

  const confirmar = () => {
    if (!selected) {
      toast.error('Escolha um item do estoque');
      return;
    }
    const qtd = parseFloat(quantity);
    if (!qtd || qtd <= 0) {
      toast.error('Informe uma quantidade maior que zero');
      return;
    }
    add.mutate(
      { orderId, item: selected, quantity: qtd },
      {
        onSuccess: () => {
          toast.success(`${selected.name} — baixa de ${qtd} no estoque`);
          setSelected(null);
          setSearch('');
          setQuantity('1');
          setOpen(false);
        },
        onError: () => toast.error('Erro ao registrar o item'),
      },
    );
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {selected.shelf ? `Prateleira ${selected.shelf} · ` : ''}
              disponível: {selected.quantity}
            </p>
          </div>
          <Input
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="w-20 text-sm"
          />
          <Button type="button" size="sm" onClick={confirmar} disabled={add.isPending}>
            Dar baixa
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(null)}>
            Trocar
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-9 text-sm"
              placeholder="Buscar por nome, apelido ou prateleira..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="divide-y max-h-56 overflow-y-auto">
            {resultados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum item encontrado</p>
            ) : (
              resultados.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="w-full flex items-center justify-between gap-2 py-2 text-left hover:bg-muted/50 transition-colors px-1 rounded"
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.shelf ? `Prat. ${item.shelf}` : 'sem prateleira'}
                      {item.aliases.length > 0 ? ` · ${item.aliases.join(', ')}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium shrink-0 ${item.quantity <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {item.quantity}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/**
 * Peças do estoque consumidas por esta OS.
 *
 * É controle interno: não entra no orçamento nem no recibo do cliente.
 * Adicionar aqui dá baixa no estoque; remover devolve a quantidade.
 */
export function OrderStockItems({
  orderId,
  showSeparator = true,
}: {
  orderId: string;
  showSeparator?: boolean;
}) {
  const { data: usos, error } = useOrderStockItems(orderId);

  if (error) {
    return (
      <div className="space-y-2 pt-2">
        {showSeparator && <Separator />}
        <h3 className="text-sm font-semibold">Itens do estoque utilizados</h3>
        <p className="text-xs text-muted-foreground">
          Rode a migração <code className="font-mono">003_stock.sql</code> no Supabase para habilitar o estoque.
        </p>
      </div>
    );
  }

  const lista = usos ?? [];

  return (
    <div className="space-y-3 pt-2">
      {showSeparator && <Separator />}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Itens do estoque utilizados</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Lock className="h-2.5 w-2.5" /> uso interno
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Não aparece no orçamento nem no recibo. Adicionar dá baixa no estoque; remover devolve.
        </p>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">Nenhum item registrado</p>
      ) : (
        <div className="divide-y">
          {lista.map(u => (
            <UsageRow key={u.id} usage={u} />
          ))}
        </div>
      )}

      <AddUsage orderId={orderId} />
    </div>
  );
}
