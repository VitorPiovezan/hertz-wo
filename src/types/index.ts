export type PaymentMethod = "pix" | "card" | "cash";
export type OrderStatus = "pending" | "in_review" | "in_progress" | "completed";
export type PaymentStatus = "pending" | "paid";
export type BudgetStatus = "draft" | "sent" | "approved" | "rejected";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone_primary: string;
  phones_secondary: string[];
  address?: string;
  cpf_cnpj?: string;
  notes?: string;
  created_at: string;
}

export interface OrderValue {
  id: string;
  order_id: string;
  label: string;
  amount: number;
}

/** Um valor recebido (entrada ou parcela) de uma OS. */
export interface OrderPayment {
  id: string;
  order_id: string;
  amount: number;
  method?: PaymentMethod;
  paid_at: string;
  notes?: string;
  created_at?: string;
}

export interface OrderMessage {
  id: string;
  order_id: string;
  content?: string;
  type: "text" | "image";
  image_url?: string;
  created_at: string;
}

export interface ServiceOrder {
  id: string;
  order_number?: number;
  user_id: string;
  client_id?: string | null;
  client?: Client;
  equipment_name: string;
  maintenance_type: string;
  status: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_amount?: number;
  payment_date?: string;
  payment_notes?: string;
  deadline?: string;
  notes?: string;
  created_at: string;
  values?: OrderValue[];
  messages?: OrderMessage[];
  payments?: OrderPayment[];
  stock_items?: OrderStockItem[];
}

/** Item do estoque. `shelf` é a prateleira, sempre com 5 dígitos. */
export interface StockItem {
  id: string;
  user_id: string;
  name: string;
  aliases: string[];
  shelf?: string;
  quantity: number;
  notes?: string;
  created_at: string;
}

/** Item do estoque consumido por uma OS — controle interno, não sai para o cliente. */
export interface OrderStockItem {
  id: string;
  order_id: string;
  item_id?: string | null;
  /** Nome no momento do uso, para o histórico sobreviver a renomeação/exclusão. */
  item_name?: string;
  quantity: number;
  created_at?: string;
  item?: StockItem;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  label: string;
  amount: number;
}

export interface Budget {
  id: string;
  user_id: string;
  client_id?: string | null;
  client?: Client;
  equipment_name: string;
  notes?: string;
  /** Anotação de uso interno — nunca sai no PDF entregue ao cliente. */
  internal_notes?: string;
  status: BudgetStatus;
  created_at: string;
  items?: BudgetItem[];
}

export interface DateRange {
  from: Date;
  to: Date;
}
