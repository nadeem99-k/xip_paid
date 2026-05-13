-- 1. Create the old_users table by copying the structure of the users table
-- If you don't have a 'users' table in public, this might need to be adjusted for 'profiles' or 'auth.users'
-- Based on the app code, the table is named 'users' in the public schema.

CREATE TABLE IF NOT EXISTS old_users (
    LIKE users INCLUDING ALL
);

-- 2. Move users who were created before today to old_users
-- Note: 'created_at' is assumed to exist. If not, we use another timestamp.
INSERT INTO old_users
SELECT * FROM users
WHERE created_at < NOW() - INTERVAL '1 day'
ON CONFLICT (id) DO NOTHING;

-- 3. Delete the moved users from the main table to free up 'active' space
-- WARNING: This will NOT reduce total project storage until Supabase vacuums the DB
-- or if you move this data to another project.
DELETE FROM users
WHERE id IN (SELECT id FROM old_users);

-- 4. CLEANUP: Clear old API key usage logs (The real storage eaters)
-- Keep only the last 7 days of logs
DELETE FROM api_key_usage
WHERE request_date < CURRENT_DATE - INTERVAL '7 days';

-- 5. Vacuum the database to reclaim space (Optional, might require superuser)
-- VACUUM FULL; 
