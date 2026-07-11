-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients
create table clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone_primary text not null,
  phones_secondary jsonb default '[]',
  address text,
  cpf_cnpj text,
  notes text,
  created_at timestamptz default now()
);
alter table clients enable row level security;
create policy "Users can manage their own clients" on clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Service Orders
create table service_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  equipment_name text not null,
  maintenance_type text not null,
  status text default 'pending' check (status in ('pending','in_review','in_progress','completed')),
  payment_status text check (payment_status in ('pending','paid')),
  payment_method text check (payment_method in ('pix','card','cash')),
  payment_amount numeric(10,2),
  payment_date timestamptz,
  payment_notes text,
  deadline timestamptz,
  notes text,
  created_at timestamptz default now()
);
alter table service_orders enable row level security;
create policy "Users can manage their own orders" on service_orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Order Values
create table order_values (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references service_orders(id) on delete cascade,
  label text not null,
  amount numeric(10,2) not null
);
alter table order_values enable row level security;
create policy "Users can manage values of their orders" on order_values for all using (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
) with check (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
);

-- Order Messages
create table order_messages (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references service_orders(id) on delete cascade,
  content text,
  type text default 'text' check (type in ('text','image')),
  image_url text,
  created_at timestamptz default now()
);
alter table order_messages enable row level security;
create policy "Users can manage messages of their orders" on order_messages for all using (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
) with check (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
);

-- Budgets
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  equipment_name text not null,
  notes text,
  status text default 'draft' check (status in ('draft','sent','approved','rejected')),
  created_at timestamptz default now()
);
alter table budgets enable row level security;
create policy "Users can manage their own budgets" on budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Budget Items
create table budget_items (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade,
  label text not null,
  amount numeric(10,2) not null
);
alter table budget_items enable row level security;
create policy "Users can manage items of their budgets" on budget_items for all using (
  exists (select 1 from budgets where id = budget_id and user_id = auth.uid())
) with check (
  exists (select 1 from budgets where id = budget_id and user_id = auth.uid())
);

-- Storage bucket for order images (run in Supabase dashboard Storage tab)
-- Create a bucket named "order-images" with public access
