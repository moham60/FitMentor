-- Chatbot conversation history for frontend Supabase client usage.
-- Run this in Supabase SQL Editor if you are not using the Supabase CLI.

create table if not exists public.chatbot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbot_conversations_user_updated_at
  on public.chatbot_conversations(user_id, updated_at desc);

create index if not exists idx_chatbot_messages_conversation_created_at
  on public.chatbot_messages(conversation_id, created_at asc);

alter table public.chatbot_conversations enable row level security;
alter table public.chatbot_messages enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.chatbot_conversations to authenticated;
grant select, insert, delete on public.chatbot_messages to authenticated;

drop policy if exists "Users can read own chatbot conversations" on public.chatbot_conversations;
drop policy if exists "Users can create own chatbot conversations" on public.chatbot_conversations;
drop policy if exists "Users can update own chatbot conversations" on public.chatbot_conversations;
drop policy if exists "Users can delete own chatbot conversations" on public.chatbot_conversations;

create policy "Users can read own chatbot conversations"
  on public.chatbot_conversations
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create own chatbot conversations"
  on public.chatbot_conversations
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own chatbot conversations"
  on public.chatbot_conversations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own chatbot conversations"
  on public.chatbot_conversations
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read messages from own conversations" on public.chatbot_messages;
drop policy if exists "Users can create messages in own conversations" on public.chatbot_messages;
drop policy if exists "Users can delete messages from own conversations" on public.chatbot_messages;

create policy "Users can read messages from own conversations"
  on public.chatbot_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chatbot_conversations
      where chatbot_conversations.id = chatbot_messages.conversation_id
        and chatbot_conversations.user_id = auth.uid()
    )
  );

create policy "Users can create messages in own conversations"
  on public.chatbot_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.chatbot_conversations
      where chatbot_conversations.id = chatbot_messages.conversation_id
        and chatbot_conversations.user_id = auth.uid()
    )
  );

create policy "Users can delete messages from own conversations"
  on public.chatbot_messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.chatbot_conversations
      where chatbot_conversations.id = chatbot_messages.conversation_id
        and chatbot_conversations.user_id = auth.uid()
    )
  );

