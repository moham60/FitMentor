# Commands to apply the migration

# 1. Make sure Supabase CLI is running
supabase status

# 2. Apply the new migration
supabase db push

# 3. Verify the migration
supabase db diff

# Alternative: Run the migration directly
# supabase db execute --file supabase/migrations/20260117000000_add_account_type_to_profiles.sql
