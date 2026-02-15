-- SQL script to set admin role for specific email
-- Run this in your Supabase SQL Editor

-- Set nadeemalikalhoro310@gmail.com as admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'nadeemalikalhoro310@gmail.com';

-- Verify the change
SELECT email, role, coins, created_at 
FROM users 
WHERE email = 'nadeemalikalhoro310@gmail.com';
