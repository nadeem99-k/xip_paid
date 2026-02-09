-- FINAL REPAIR SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Ensure users table is correct (Only if columns are missing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS package TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Drop restricting constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_package_check;

-- 2. Clean up Payments table
-- If you have errors about columns missing, this will fix them:
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS package TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- 3. Fix Foreign Key Constraint
-- We drop and recreate it to be sure it points to the correct ID column
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Generations Table
ALTER TABLE generations ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE generations ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE generations ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS model TEXT;

CREATE TABLE IF NOT EXISTS generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    mode TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Storage Bucket (Make sure it's public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, resolved, closed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
-- CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
