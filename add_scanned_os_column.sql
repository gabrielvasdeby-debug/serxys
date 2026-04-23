ALTER TABLE IF EXISTS orders 
ADD COLUMN IF NOT EXISTS scanned_os_url TEXT;

COMMENT ON COLUMN orders.scanned_os_url IS 'URL for the scanned PDF/Image of the manually signed Service Order';
