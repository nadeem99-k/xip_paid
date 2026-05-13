-- AGGRESSIVE STORAGE CLEANUP
-- Run this in your Supabase SQL Editor to free up space immediately.

-- 1. DESTRUCTIVE: Delete the majority of usage logs
-- This table often grows very large. We will only keep the last 2 days.
DELETE FROM api_key_usage
WHERE request_date < CURRENT_DATE - INTERVAL '2 days';

-- 2. Clear out any old sessions or logs if they exist (Generic names common in Supabase apps)
-- If you have a 'logs' table, uncomment the next line:
-- TRUNCATE TABLE logs;

-- 3. If you already moved users to 'old_users', consider exporting them and then DROPING the table.
-- Storage is only freed when rows are DELETED, not just MOVED to another table in the same DB.
-- To drop the table after you have a backup:
-- DROP TABLE old_users;

-- 4. Reclaim physical disk space
-- Note: 'VACUUM FULL' can take several minutes and locks the database. 
-- Only run this if the 'DELETE' commands above don't lower the storage percentage enough.
VACUUM FULL;
