-- 1. Create the promo_codes table
CREATE TABLE promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NULL
);

-- Note: If you have already run the above, you can simply run this instead:
-- ALTER TABLE promo_codes ADD COLUMN expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create the increment_promo_usage function
-- This allows the server to safely increment the usage count when a code is used.
CREATE OR REPLACE FUNCTION increment_promo_usage(code_text text)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes
  SET usage_count = usage_count + 1
  WHERE code = code_text;
END;
$$ LANGUAGE plpgsql;
