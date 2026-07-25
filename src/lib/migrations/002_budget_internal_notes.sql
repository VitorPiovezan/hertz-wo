-- Migração 002 — observação interna do orçamento
--
-- Campo só para uso interno (custo de peça, margem, lembrete de negociação).
-- NÃO é impresso no PDF entregue ao cliente — lá continua saindo apenas
-- `notes`. Ver src/components/budgets/BudgetPDF.tsx.
--
-- Rode no SQL Editor do Supabase (projeto xoausmvzjomshfgweais).
-- É seguro rodar mais de uma vez e não altera nenhum dado existente:
-- a coluna nasce nula nos orçamentos que já existem.

alter table budgets add column if not exists internal_notes text;
