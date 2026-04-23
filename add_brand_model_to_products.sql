-- Adicionar colunas de Marca e Modelo à tabela de produtos
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT '';
