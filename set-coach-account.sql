-- Quick fix script: Run this in Supabase SQL Editor to set your account as coach
-- Replace 'YOUR_EMAIL_HERE' with your actual email

UPDATE public.profiles 
SET account_type = 'coach'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'YOUR_EMAIL_HERE'
);

-- Verify the change
SELECT p.user_id, u.email, p.full_name, p.account_type
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';
