ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES company_settings(id) DEFAULT 'main';
UPDATE orders SET company_id = 'main' WHERE company_id IS NULL;
