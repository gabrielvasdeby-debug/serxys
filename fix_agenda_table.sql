-- =====================================================
-- SERVYX - Agenda Table Fix (Schema & RLS)
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar colunas ausentes na tabela 'agenda'
DO $$ 
BEGIN 
    -- Coluna: technician_name (Nome do técnico para exibição rápida)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda' AND column_name='technician_name') THEN
        ALTER TABLE public.agenda ADD COLUMN technician_name TEXT;
    END IF;

    -- Coluna: priority (Prioridade da tarefa: Baixa, Média, Alta)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda' AND column_name='priority') THEN
        ALTER TABLE public.agenda ADD COLUMN priority TEXT DEFAULT 'Média';
    END IF;

    -- Coluna: type (Tipo: manual ou os)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda' AND column_name='type') THEN
        ALTER TABLE public.agenda ADD COLUMN type TEXT DEFAULT 'manual';
    END IF;

    -- Coluna: user_id (Usuário que criou a tarefa)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda' AND column_name='user_id') THEN
        ALTER TABLE public.agenda ADD COLUMN user_id TEXT;
    END IF;

    -- Coluna: os_id (ID da Ordem de Serviço vinculada)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda' AND column_name='os_id') THEN
        ALTER TABLE public.agenda ADD COLUMN os_id TEXT;
    END IF;

    -- Coluna: os_number (Número da Ordem de Serviço vinculada)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda' AND column_name='os_number') THEN
        ALTER TABLE public.agenda ADD COLUMN os_number INTEGER;
    END IF;

    -- Corrigir padrão do status se necessário (Schema original tinha 'agendado')
    -- O código da aplicação usa 'Pendente', 'Em andamento', 'Concluída'
    -- Alteramos o default para 'Pendente' para bater com o código
    ALTER TABLE public.agenda ALTER COLUMN status SET DEFAULT 'Pendente';
END $$;

-- 2. Desativar RLS para permitir criação e consulta de tarefas sem bloqueios
ALTER TABLE public.agenda DISABLE ROW LEVEL SECURITY;

-- 3. Mensagem de sucesso
COMMENT ON TABLE public.agenda IS 'Tabela de agenda atualizada com suporte a vinculação de OS e RLS desativado.';
