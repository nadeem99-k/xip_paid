-- SQL Script to Fix Admin and Coins Issues
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lxyyugiwagokeatmedaf/sql

-- ============================================
-- STEP 1: Set nadeemalikalhoro310@gmail.com as admin
-- ============================================
UPDATE users 
SET role = 'admin' 
WHERE email = 'nadeemalikalhoro310@gmail.com';

-- ============================================
-- STEP 2: Fix coins for this user (set to 3 if needed)
-- ============================================
UPDATE users 
SET coins = 3
WHERE email = 'nadeemalikalhoro310@gmail.com' 
AND coins < 3;

-- ============================================
-- STEP 3: Check if there's a default value on coins column
-- ============================================
-- Query to see table structure
SELECT column_name, column_default, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'coins';

-- ============================================
-- STEP 4: Verify the changes
-- ============================================
SELECT 
    email, 
    role, 
    coins, 
    package,
    created_at 
FROM users 
WHERE email = 'nadeemalikalhoro310@gmail.com';

-- ============================================
-- STEP 5: Check all recent user signups
-- ============================================
SELECT 
    email, 
    role, 
    coins, 
    created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================
-- OPTIONAL: Fix default coins for ALL users who have less than 3
-- ============================================
-- UPDATE users 
-- SET coins = 3 
-- WHERE coins < 3 AND package = 'free';
