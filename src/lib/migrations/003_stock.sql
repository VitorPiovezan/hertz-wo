-- Migração 003 — controle de estoque
--
-- `stock_items` guarda o item, seus apelidos (para achar pelo nome que você
-- realmente usa no dia a dia), a prateleira e a quantidade atual.
--
-- `order_stock_items` registra o que cada OS consumiu. É controle interno:
-- não sai no orçamento nem no recibo do cliente.
--
-- A quantidade de `stock_items` é mantida pelo app: entradas e saídas na tela
-- de Estoque somam/subtraem, e mexer no uso dentro de uma OS aplica a
-- diferença. Por isso `quantity` é a fonte de verdade do saldo.
--
-- Rode no SQL Editor do Supabase (projeto xoausmvzjomshfgweais).
-- É seguro rodar mais de uma vez e não altera nada do que já existe.

create extension if not exists "uuid-ossp";

create table if not exists stock_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  -- apelidos: ["capacitor eletrolítico", "cap 100uf"]
  aliases jsonb default '[]',
  -- prateleira sempre com 5 dígitos; text para não perder os zeros à esquerda
  shelf text,
  quantity numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now()
);

create index if not exists stock_items_user_idx on stock_items(user_id);

alter table stock_items enable row level security;
drop policy if exists "Users can manage their own stock" on stock_items;
create policy "Users can manage their own stock" on stock_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists order_stock_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references service_orders(id) on delete cascade,
  item_id uuid references stock_items(id) on delete set null,
  -- nome no momento do uso: o histórico da OS não se perde se o item
  -- for renomeado ou excluído do estoque depois
  item_name text,
  quantity numeric(10,2) not null default 1,
  created_at timestamptz default now()
);

create index if not exists order_stock_items_order_idx on order_stock_items(order_id);

alter table order_stock_items enable row level security;
drop policy if exists "Users can manage stock usage of their orders" on order_stock_items;
create policy "Users can manage stock usage of their orders" on order_stock_items for all using (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
) with check (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
);
