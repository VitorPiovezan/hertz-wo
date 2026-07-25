'use client';

import {
  formatCurrency,
  isSettledOrder,
  orderReceived,
  orderTotal,
  remainingBalance,
} from '@/lib/utils';
import type { ServiceOrder } from '@/types';

/**
 * Recebido (verde) e saldo restante (amarelo) ao lado do valor da OS.
 *
 * Vale para qualquer status: um adiantamento numa OS em andamento aparece
 * igual a um pagamento parcial de uma OS concluída. Some quando não há
 * dinheiro recebido, e o saldo some quando a OS já está quitada.
 */
export function PaymentAmounts({
  order,
  className = '',
}: {
  order: ServiceOrder;
  className?: string;
}) {
  const received = orderReceived(order);
  // OS concluída e quitada vive em "Serviços Concluídos" com o valor cheio.
  if (received <= 0 || isSettledOrder(order)) return null;

  const balance = remainingBalance(orderTotal(order), received);

  return (
    <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${className}`}>
      <span className="font-medium text-green-600 dark:text-green-400">
        {formatCurrency(received)}
      </span>
      {balance > 0 && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {formatCurrency(balance)}
          </span>
        </>
      )}
    </span>
  );
}
