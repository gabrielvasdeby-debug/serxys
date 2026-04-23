-- Ver quais OS estão duplicadas
SELECT os_number, COUNT(*) as quantidade, array_agg(id) as ids, array_agg(created_at) as datas
FROM orders
GROUP BY os_number
HAVING COUNT(*) > 1
ORDER BY os_number;

-- Deletar os duplicados mantendo apenas o mais recente de cada OS
DELETE FROM orders
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY os_number ORDER BY created_at DESC) as rn
    FROM orders
  ) ranked
  WHERE rn > 1
);

-- Confirmar que não há mais duplicados
SELECT os_number, COUNT(*) as qtd
FROM orders
GROUP BY os_number
HAVING COUNT(*) > 1;
