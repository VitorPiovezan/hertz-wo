'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAddPayment,
  useDeletePayment,
  useUpdatePayment,
  useSetLegacyPaymentAmount,
  paymentsTableIsAvailable,
} from '@/hooks/useOrders';
import {
  formatCurrency,
  formatDate,
  orderReceived,
  orderTotal,
  remainingBalance,
  PAYMENT_METHOD_LABELS,
} from '@/lib/utils';
import type { OrderPayment, PaymentMethod, ServiceOrder } from '@/types';
import toast from 'react-hot-toast';

/** timestamptz -> yyyy-MM-dd para o input date */
const toDateInput = (iso: string) => iso.slice(0, 10);
/** yyyy-MM-dd -> ISO ao meio-dia, para o fuso não jogar o lançamento para o dia anterior */
const fromDateInput = (d: string) => new Date(`${d}T12:00:00`).toISOString();

function MethodSelect({
  value,
  onChange,
}: {
  value?: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}) {
  return (
    <Select
      value={value ?? null}
      onValueChange={(v: string | null) => onChange((v ?? 'pix') as PaymentMethod)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Forma" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pix">PIX</SelectItem>
        <SelectItem value="card">Cartão</SelectItem>
        <SelectItem value="cash">Dinheiro</SelectItem>
      </SelectContent>
    </Select>
  );
}

function PaymentRow({
  payment,
  orderId,
}: {
  payment: OrderPayment;
  orderId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(payment.amount));
  const [date, setDate] = useState(toDateInput(payment.paid_at));
  const [method, setMethod] = useState<PaymentMethod | undefined>(payment.method);
  const update = useUpdatePayment();
  const remove = useDeletePayment();

  const cancel = () => {
    setAmount(String(payment.amount));
    setDate(toDateInput(payment.paid_at));
    setMethod(payment.method);
    setEditing(false);
  };

  const save = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    update.mutate(
      { id: payment.id, orderId, amount: parsed, method, paid_at: fromDateInput(date) },
      {
        onSuccess: () => {
          toast.success('Pagamento atualizado');
          setEditing(false);
        },
        onError: () => toast.error('Erro ao atualizar pagamento'),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm(`Remover o pagamento de ${formatCurrency(Number(payment.amount))}?`)) return;
    remove.mutate(
      { id: payment.id, orderId },
      {
        onSuccess: () => toast.success('Pagamento removido'),
        onError: () => toast.error('Erro ao remover pagamento'),
      },
    );
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-sm py-1.5">
        <span className="text-muted-foreground w-20 shrink-0">
          {formatDate(payment.paid_at)}
        </span>
        <span className="text-muted-foreground flex-1 truncate">
          {payment.method ? PAYMENT_METHOD_LABELS[payment.method] : '—'}
        </span>
        <span className="font-medium text-green-600 dark:text-green-400">
          {formatCurrency(Number(payment.amount))}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => setEditing(true)}
        >
          Editar
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleDelete}
          disabled={remove.isPending}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      <Input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="w-36 text-sm"
      />
      <div className="w-32">
        <MethodSelect value={method} onChange={setMethod} />
      </div>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-28 text-sm"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={save}
        disabled={update.isPending}
      >
        <Check className="h-4 w-4 text-green-600" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={cancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddPaymentRow({ orderId, noun }: { orderId: string; noun: string }) {
  const label = `Adicionar ${noun.toLowerCase()}`;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const add = useAddPayment();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {label}
      </Button>
    );
  }

  const save = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    add.mutate(
      { orderId, amount: parsed, method, paid_at: fromDateInput(date) },
      {
        onSuccess: () => {
          toast.success(`${noun} registrado`);
          setAmount('');
          setOpen(false);
        },
        onError: () => toast.error('Erro ao registrar pagamento'),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="w-36 text-sm"
      />
      <div className="w-32">
        <MethodSelect value={method} onChange={setMethod} />
      </div>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="0,00"
        className="w-28 text-sm"
      />
      <Button type="button" size="sm" onClick={save} disabled={add.isPending}>
        Adicionar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
    </div>
  );
}

/** Correção do valor recebido quando a tabela de histórico ainda não existe. */
function LegacyAmountEditor({ order }: { order: ServiceOrder }) {
  const [amount, setAmount] = useState(String(orderReceived(order) || ''));
  const [method, setMethod] = useState<PaymentMethod | undefined>(order.payment_method);
  const setLegacy = useSetLegacyPaymentAmount();

  const save = () => {
    setLegacy.mutate(
      { orderId: order.id, amount: parseFloat(amount) || 0, method },
      {
        onSuccess: () => toast.success('Valor recebido atualizado'),
        onError: () => toast.error('Erro ao atualizar valor recebido'),
      },
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        O histórico por lançamento ainda não está disponível neste banco. Você pode corrigir o
        total recebido abaixo.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Total recebido</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-32 text-sm"
          />
        </div>
        <div className="space-y-1.5 w-32">
          <Label className="text-xs">Forma</Label>
          <MethodSelect value={method} onChange={setMethod} />
        </div>
        <Button type="button" size="sm" onClick={save} disabled={setLegacy.isPending}>
          Salvar valor
        </Button>
      </div>
    </div>
  );
}

/**
 * Histórico de valores recebidos de uma OS: lista cada lançamento com a data,
 * permite corrigir, remover e adicionar. As alterações salvam na hora,
 * independentes do botão Salvar do formulário da OS.
 *
 * Funciona em qualquer status: numa OS ainda em andamento os lançamentos são
 * adiantamentos/entradas do cliente; numa concluída, o pagamento do serviço.
 */
export function OrderPaymentsEditor({
  order,
  showSeparator = true,
}: {
  order: ServiceOrder;
  showSeparator?: boolean;
}) {
  const total = orderTotal(order);
  const received = orderReceived(order);
  const balance = remainingBalance(total, received);
  const payments = [...(order.payments ?? [])].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime(),
  );
  const hasHistory = paymentsTableIsAvailable();
  const isCompleted = order.status === 'completed';
  const noun = isCompleted ? 'Pagamento' : 'Adiantamento';

  return (
    <div className="space-y-3 pt-2">
      {showSeparator && <Separator />}
      <div>
        <h3 className="text-sm font-semibold">
          {isCompleted ? 'Pagamentos recebidos' : 'Adiantamentos recebidos'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isCompleted
            ? 'A situação da OS é recalculada sozinha: só fica Paga quando o total é recebido.'
            : 'Entradas e parcelas pagas antes da conclusão. Ao concluir a OS, o valor já recebido é descontado.'}
        </p>
      </div>

      {hasHistory ? (
        <>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              {isCompleted ? 'Nenhum pagamento registrado' : 'Nenhum adiantamento registrado'}
            </p>
          ) : (
            <div className="divide-y">
              {payments.map(p => (
                <PaymentRow key={p.id} payment={p} orderId={order.id} />
              ))}
            </div>
          )}
          <AddPaymentRow orderId={order.id} noun={noun} />
        </>
      ) : (
        <LegacyAmountEditor order={order} />
      )}

      <div className="rounded-lg border bg-muted/30 px-3 py-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Recebido</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(received)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total da OS</span>
          <span className="font-medium">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Saldo devedor</span>
          <span
            className={
              balance > 0
                ? 'font-medium text-amber-600 dark:text-amber-400'
                : 'font-medium text-green-600 dark:text-green-400'
            }
          >
            {formatCurrency(balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
