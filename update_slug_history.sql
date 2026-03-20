ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS slug_history TEXT[] DEFAULT '{}';

-- Migration to ensure every company has a slug_history entry for their current slug too if needed
-- or just keep it for old ones.
