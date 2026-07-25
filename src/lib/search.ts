import type { ServiceOrder } from "@/types";

/**
 * Identificador visível da OS: ano de criação + número sequencial com 5
 * dígitos. Ex.: #202600001
 */
export function orderIdLabel(order: Pick<ServiceOrder, "order_number" | "created_at">): string | null {
  if (!order.order_number) return null;
  const ano = new Date(order.created_at).getFullYear();
  return `#${ano}${String(order.order_number).padStart(5, "0")}`;
}

/**
 * Busca única de todas as telas de OS: cliente, equipamento, tipo de
 * manutenção e número da OS.
 *
 * O número aceita as formas que a pessoa realmente digita — "#202600001",
 * "202600001", "2026", "1" ou "00001" — comparando só os dígitos.
 */
export function matchesOrderSearch(order: ServiceOrder, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;

  const idLabel = (orderIdLabel(order) ?? "").toLowerCase();
  const idDigitos = idLabel.replace(/\D/g, "");
  const digitos = t.replace(/\D/g, "");

  if (
    order.equipment_name.toLowerCase().includes(t) ||
    order.maintenance_type.toLowerCase().includes(t) ||
    (order.client?.name ?? "").toLowerCase().includes(t) ||
    idLabel.includes(t)
  ) {
    return true;
  }

  if (digitos === "") return false;
  return (
    idDigitos.includes(digitos) ||
    String(order.order_number ?? "").includes(digitos)
  );
}
