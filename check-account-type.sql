-- Check if account_type column exists in profiles table
-- Run this in Supabase SQL Editor

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if there are any profiles without account_type
SELECT user_id, full_name, account_type
FROM profiles
LIMIT 10;
