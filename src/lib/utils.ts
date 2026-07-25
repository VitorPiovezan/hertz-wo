import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OrderStatus, PaymentStatus, BudgetStatus, PaymentMethod } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function daysUntilDeadline(deadline: string): number {
  return differenceInDays(new Date(deadline), new Date());
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  in_review: "Em Aprovação",
  in_progress: "Em Andamento",
  completed: "Concluída",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Aguardando Pagamento",
  paid: "Pago",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
};

export const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  card: "Cartão",
  cash: "Dinheiro",
};

export function sumValues(values: { amount: number }[]): number {
  return values.reduce((acc, v) => acc + Number(v.amount), 0);
}

/** Tolerância de centavos para comparar valores numeric(10,2). */
const CENT_EPSILON = 0.005;

/** Total da OS (soma dos valores lançados). */
export function orderTotal(order: { values?: { amount: number }[] }): number {
  return sumValues(order.values ?? []);
}

/** Quanto já foi recebido nessa OS (soma de entradas/parcelas). */
export function orderReceived(order: { payment_amount?: number }): number {
  return Number(order.payment_amount ?? 0);
}

/** Saldo que o cliente ainda deve. */
export function remainingBalance(total: number, received: number): number {
  const balance = total - received;
  return balance < CENT_EPSILON ? 0 : balance;
}

/**
 * Só considera "pago" quando o valor total da OS foi recebido.
 * Pagamento parcial (entrada ou parcelas) continua "aguardando pagamento".
 * Quando a OS não tem valores lançados, respeita a escolha do usuário.
 */
export function resolvePaymentStatus(
  intended: PaymentStatus,
  total: number,
  received: number
): PaymentStatus {
  if (intended !== "paid") return "pending";
  if (total <= 0) return "paid";
  return received >= total - CENT_EPSILON ? "paid" : "pending";
}

/** OS concluída e quitada — sai do fluxo de trabalho e vai para "Serviços Concluídos". */
export function isSettledOrder(order: {
  status: OrderStatus;
  payment_status?: PaymentStatus;
}): boolean {
  return order.status === "completed" && order.payment_status === "paid";
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}
