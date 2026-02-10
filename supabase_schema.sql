-- FINAL REPAIR SCRIPT (Run this in Supabase SQL Editor)

-- 1. Fix Users Table (Ensure it matches Public schema)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS package TEXT DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joined_whatsapp BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Fix Payments FK (Point explicitly to public.users)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. FIX GENERATIONS TABLE (The critical part)
-- Ensure columns exist
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS model TEXT;

-- Recreate the Foreign Key to ensure it points to public.users
ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_user_id_fkey;
ALTER TABLE public.generations ADD CONSTRAINT generations_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Grant Permissions (Just in case RLS/Permissions are acting up)
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.generations TO service_role;
GRANT ALL ON TABLE public.payments TO service_role;

-- 5. Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('payment_proofs', 'payment_proofs', true) ON CONFLICT (id) DO NOTHING;
