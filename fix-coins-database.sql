-- FIX INITIAL COINS ISSUE
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Check current default value
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'coins';

-- 2. Update the default value to 3 for future users
ALTER TABLE users ALTER COLUMN coins SET DEFAULT 3;

-- 3. Fix any users who were created with 2 coins (if that's the current "broken" default)
UPDATE users 
SET coins = 3 
WHERE coins = 2 AND package = 'free';

-- 4. Verify the change
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'coins';
