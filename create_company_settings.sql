CREATE TABLE IF NOT EXISTS company_settings (
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
    public_slug TEXT UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default record if none exists
INSERT INTO company_settings (id, name, public_slug)
VALUES ('main', 'SERVYX', 'servyx')
ON CONFLICT (id) DO NOTHING;
