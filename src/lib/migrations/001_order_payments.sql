-- Migração 001 — histórico de pagamentos por OS
--
-- Antes desta migração, cada OS guardava apenas `payment_amount` (o acumulado
-- recebido) e um único `payment_date`, então não era possível saber quando cada
-- entrada/parcela entrou nem corrigir um lançamento específico.
--
-- Esta migração cria `order_payments` (um registro por valor recebido) e faz o
-- backfill do que já existe. `service_orders.payment_amount` continua sendo a
-- fonte de verdade do total recebido — o app o mantém sincronizado com a soma
-- dos lançamentos — para que todas as telas atuais sigam funcionando.
--
-- Rode no SQL Editor do Supabase (projeto xoausmvzjomshfgweais).
-- É seguro rodar mais de uma vez: nada é duplicado.

create extension if not exists "uuid-ossp";

create table if not exists order_payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references service_orders(id) on delete cascade,
  amount numeric(10,2) not null,
  method text check (method in ('pix','card','cash')),
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz default now()
);

create index if not exists order_payments_order_id_idx on order_payments(order_id);

alter table order_payments enable row level security;

drop policy if exists "Users can manage payments of their orders" on order_payments;
create policy "Users can manage payments of their orders" on order_payments for all using (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
) with check (
  exists (select 1 from service_orders where id = order_id and user_id = auth.uid())
);

-- Backfill: transforma o acumulado já existente em um lançamento único por OS.
-- O `not exists` evita duplicar se a migração for rodada de novo.
insert into order_payments (order_id, amount, method, paid_at, notes)
select
  o.id,
  o.payment_amount,
  o.payment_method,
  coalesce(o.payment_date, o.created_at),
  'Lançamento migrado do registro antigo de pagamento'
from service_orders o
where o.payment_amount is not null
  and o.payment_amount > 0
  and not exists (select 1 from order_payments p where p.order_id = o.id);
