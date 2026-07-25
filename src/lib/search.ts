import type { ServiceOrder, StockItem } from "@/types";

/** Prateleira sempre com 5 dígitos: 12 -> "00012". Vazio quando não informada. */
export function formatShelf(shelf?: string | null): string {
  const digitos = (shelf ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  return digitos.slice(-5).padStart(5, "0");
}

/**
 * Busca de estoque: nome, qualquer apelido e prateleira.
 *
 * A prateleira casa tanto digitada por extenso ("00012") quanto abreviada
 * ("12"), porque ninguém digita os zeros à esquerda no dia a dia.
 */
export function matchesStockSearch(item: StockItem, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;

  if (item.name.toLowerCase().includes(t)) return true;
  if ((item.aliases ?? []).some((a) => a.toLowerCase().includes(t))) return true;

  const prateleira = formatShelf(item.shelf);
  if (prateleira && prateleira.includes(t)) return true;

  const digitos = t.replace(/\D/g, "");
  if (digitos === "" || !prateleira) return false;
  // "12" acha a prateleira "00012"
  return prateleira === digitos.padStart(5, "0") || prateleira.includes(digitos);
}

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
