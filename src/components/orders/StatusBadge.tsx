"use client";

import { cn, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, BUDGET_STATUS_LABELS, BUDGET_STATUS_COLORS, daysUntilDeadline } from "@/lib/utils";
import type { OrderStatus, PaymentStatus, BudgetStatus } from "@/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", ORDER_STATUS_COLORS[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", PAYMENT_STATUS_COLORS[status])}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", BUDGET_STATUS_COLORS[status])}>
      {BUDGET_STATUS_LABELS[status]}
    </span>
  );
}

export function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntilDeadline(deadline);
  if (days > 3) return null;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      days < 0
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    )}>
      {days < 0 ? `${Math.abs(days)}d em atraso` : days === 0 ? "Vence hoje" : `${days}d restantes`}
    </span>
  );
}
