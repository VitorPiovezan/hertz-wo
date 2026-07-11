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
  status: BudgetStatus;
  created_at: string;
  items?: BudgetItem[];
}

export interface DateRange {
  from: Date;
  to: Date;
}
