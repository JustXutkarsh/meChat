alter table public.conversations
add column if not exists last_message_sender_id text references public.profiles(id) on delete set null;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id text references public.profiles(id) on delete cascade,
  receiver_id text references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sender_id, receiver_id),
  check (sender_id <> receiver_id),
  check (status in ('pending', 'accepted', 'rejected'))
);

create index if not exists idx_friend_requests_sender_id on public.friend_requests(sender_id);
create index if not exists idx_friend_requests_receiver_id on public.friend_requests(receiver_id);
create index if not exists idx_friend_requests_status on public.friend_requests(status);

alter table public.friend_requests enable row level security;

drop policy if exists "Users can read their friend requests" on public.friend_requests;
create policy "Users can read their friend requests"
on public.friend_requests
for select
to authenticated
using (
  sender_id = auth.jwt() ->> 'sub'
  or receiver_id = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
on public.friend_requests
for insert
to authenticated
with check (
  sender_id = auth.jwt() ->> 'sub'
  and status = 'pending'
  and sender_id <> receiver_id
);

drop policy if exists "Receivers can update friend requests" on public.friend_requests;
create policy "Receivers can update friend requests"
on public.friend_requests
for update
to authenticated
using (
  receiver_id = auth.jwt() ->> 'sub'
)
with check (
  receiver_id = auth.jwt() ->> 'sub'
  and status in ('accepted', 'rejected')
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(id) on delete cascade,
  actor_id text references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  is_read boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  check (type in ('friend_request', 'friend_request_accepted', 'message'))
);

create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_id_is_read on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (
  user_id = auth.jwt() ->> 'sub'
)
with check (
  user_id = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can create notifications as actor" on public.notifications;
create policy "Users can create notifications as actor"
on public.notifications
for insert
to authenticated
with check (
  actor_id = auth.jwt() ->> 'sub'
);
