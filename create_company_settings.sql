CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  name TEXT,
  cnpj TEXT,
  whatsapp TEXT,
  phone TEXT,
  email TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  complement TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  logo_url TEXT,
  public_slug TEXT,
  slug_history JSONB DEFAULT '[]',
  mensagem_acompanhamento_os TEXT DEFAULT 'Olá, {cliente} 👋\n\nJá está disponível o acompanhamento da sua Ordem de Serviço nº {os}.\nVocê pode visualizar todas as atualizações em tempo real pelo link abaixo:\n\n{link}\n\n{empresa}\nAgradecemos pela confiança em nossos serviços.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_settings DISABLE ROW LEVEL SECURITY;

