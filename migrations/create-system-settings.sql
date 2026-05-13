-- Migration: Create System Settings Table
-- Description: Stores dynamic application settings and security whitelists

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins full access
-- Note: Replace with your actual admin check logic if needed
CREATE POLICY "Allow admins full access" ON public.system_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert initial empty whitelist
INSERT INTO public.system_settings (key, value)
VALUES ('security_whitelist', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.system_settings IS 'Stores system-wide configuration keys and values, including the security whitelist.';
