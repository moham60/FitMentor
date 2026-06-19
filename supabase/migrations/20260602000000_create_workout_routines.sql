create table if not exists public.workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_model text not null default 'model2',
  plan jsonb not null,
  plan_version integer not null default 1,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_workout_sessions
  add column if not exists routine_id uuid references public.workout_routines(id) on delete set null;

create index if not exists idx_workout_routines_user_created_at
  on public.workout_routines(user_id, created_at desc);

create index if not exists idx_workout_routines_user_last_used_at
  on public.workout_routines(user_id, last_used_at desc);

create index if not exists idx_user_workout_sessions_routine_id
  on public.user_workout_sessions(routine_id);

alter table public.workout_routines enable row level security;

grant select, insert, update, delete on public.workout_routines to authenticated;

drop policy if exists "Users can read own workout routines" on public.workout_routines;
drop policy if exists "Users can create own workout routines" on public.workout_routines;
drop policy if exists "Users can update own workout routines" on public.workout_routines;
drop policy if exists "Users can delete own workout routines" on public.workout_routines;

create policy "Users can read own workout routines"
  on public.workout_routines
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create own workout routines"
  on public.workout_routines
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own workout routines"
  on public.workout_routines
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own workout routines"
  on public.workout_routines
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read routine sessions" on public.user_workout_sessions;
drop policy if exists "Users can create routine sessions" on public.user_workout_sessions;
drop policy if exists "Users can update routine sessions" on public.user_workout_sessions;
drop policy if exists "Users can delete routine sessions" on public.user_workout_sessions;

create policy "Users can read own workout sessions"
  on public.user_workout_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create own workout sessions"
  on public.user_workout_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own workout sessions"
  on public.user_workout_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own workout sessions"
  on public.user_workout_sessions
  for delete
  to authenticated
  using (user_id = auth.uid());