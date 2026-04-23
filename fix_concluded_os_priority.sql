-- Corrigir prioridade de OS já concluídas/encerradas
-- Executa esse script no Supabase SQL Editor para corrigir os registros existentes

UPDATE orders
SET 
  priority = 'Baixa',
  updated_at = NOW()
WHERE 
  status IN (
    'Reparo Concluído',
    'Equipamento Retirado',
    'Orçamento Cancelado',
    'Sem Reparo'
  )
  AND priority != 'Baixa';

-- Verificação: mostra quantos registros foram afetados
SELECT 
  status,
  priority,
  COUNT(*) as total
FROM orders
WHERE status IN (
  'Reparo Concluído',
  'Equipamento Retirado',
  'Orçamento Cancelado',
  'Sem Reparo'
)
GROUP BY status, priority
ORDER BY status;
