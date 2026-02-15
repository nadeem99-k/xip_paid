-- FIX: Enable RLS and add policies for the users table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Enable RLS on the users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Create policy: Users can viewed their own record
-- This allows the useUser hook (client-side) to fetch coins, role, etc.
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" 
ON users FOR SELECT 
TO authenticated 
USING (auth.email() = email);

-- 3. Create policy: Users can update their own record
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" 
ON users FOR UPDATE 
TO authenticated 
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

-- 4. Create policy: Service role can do everything (usually default, but good to ensure)
DROP POLICY IF EXISTS "Service role full access" ON users;
CREATE POLICY "Service role full access" 
ON users FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. Verification: Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'users';
