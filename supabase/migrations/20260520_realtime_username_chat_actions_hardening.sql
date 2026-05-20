alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.friend_requests;

create unique index if not exists profiles_username_unique_idx
on public.profiles (lower(username))
where username is not null;

alter table public.profiles
drop constraint if exists username_format_check;

alter table public.profiles
add constraint username_format_check
check (
  username is null
  or (
    username = lower(username)
    and length(username) between 3 and 30
    and username ~ '^[a-z0-9_][a-z0-9_.]*[a-z0-9_]$'
    and username not like '.%'
    and username not like '%.'
    and username not like '%..%'
  )
);

create table if not exists public.conversation_clears (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id text references public.profiles(id) on delete cascade,
  cleared_at timestamptz default now(),
  unique(conversation_id, user_id)
);

alter table public.conversation_clears enable row level security;

drop policy if exists "Users can read own conversation clears" on public.conversation_clears;
create policy "Users can read own conversation clears"
on public.conversation_clears
for select
to authenticated
using (
  user_id = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can upsert own conversation clears" on public.conversation_clears;
create policy "Users can upsert own conversation clears"
on public.conversation_clears
for insert
to authenticated
with check (
  user_id = auth.jwt() ->> 'sub'
  and public.is_conversation_participant(conversation_id, auth.jwt() ->> 'sub')
);

drop policy if exists "Users can update own conversation clears" on public.conversation_clears;
create policy "Users can update own conversation clears"
on public.conversation_clears
for update
to authenticated
using (
  user_id = auth.jwt() ->> 'sub'
)
with check (
  user_id = auth.jwt() ->> 'sub'
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id text references public.profiles(id) on delete cascade,
  blocked_id text references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocker_id on public.user_blocks(blocker_id);
create index if not exists idx_user_blocks_blocked_id on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users can read own blocks" on public.user_blocks;
create policy "Users can read own blocks"
on public.user_blocks
for select
to authenticated
using (
  blocker_id = auth.jwt() ->> 'sub'
  or blocked_id = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can block users" on public.user_blocks;
create policy "Users can block users"
on public.user_blocks
for insert
to authenticated
with check (
  blocker_id = auth.jwt() ->> 'sub'
  and blocker_id <> blocked_id
);

drop policy if exists "Users can unblock own blocks" on public.user_blocks;
create policy "Users can unblock own blocks"
on public.user_blocks
for delete
to authenticated
using (
  blocker_id = auth.jwt() ->> 'sub'
);

alter table public.friend_requests
drop constraint if exists friend_requests_status_check;

alter table public.friend_requests
add constraint friend_requests_status_check
check (status in ('pending', 'accepted', 'rejected', 'removed'));

drop policy if exists "Users can read messages from their conversations" on public.messages;
create policy "Users can read messages from their conversations"
on public.messages
for select
to authenticated
using (
  public.is_conversation_participant(conversation_id, auth.jwt() ->> 'sub')
);

drop policy if exists "Users can send messages in their conversations" on public.messages;
create policy "Users can send messages in their conversations"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.jwt() ->> 'sub'
  and public.is_conversation_participant(conversation_id, auth.jwt() ->> 'sub')
);
