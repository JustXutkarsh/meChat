create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  caller_id text references public.profiles(id) on delete cascade,
  receiver_id text references public.profiles(id) on delete cascade,
  status text not null default 'ringing',
  call_type text not null default 'video',
  provider text not null default 'daily',
  room_url text,
  room_name text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (caller_id <> receiver_id),
  check (status in ('ringing', 'accepted', 'declined', 'missed', 'ended', 'failed')),
  check (call_type in ('video'))
);

create index if not exists idx_calls_conversation_id_created_at on public.calls(conversation_id, created_at desc);
create index if not exists idx_calls_caller_id_created_at on public.calls(caller_id, created_at desc);
create index if not exists idx_calls_receiver_id_created_at on public.calls(receiver_id, created_at desc);
create index if not exists idx_calls_status on public.calls(status);

alter table public.calls enable row level security;

drop policy if exists "Users can read own calls" on public.calls;
create policy "Users can read own calls"
on public.calls
for select
to authenticated
using (
  caller_id = auth.jwt() ->> 'sub'
  or receiver_id = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can create calls as caller" on public.calls;
create policy "Users can create calls as caller"
on public.calls
for insert
to authenticated
with check (
  caller_id = auth.jwt() ->> 'sub'
  and caller_id <> receiver_id
  and status = 'ringing'
);

drop policy if exists "Users can update own calls" on public.calls;
create policy "Users can update own calls"
on public.calls
for update
to authenticated
using (
  caller_id = auth.jwt() ->> 'sub'
  or receiver_id = auth.jwt() ->> 'sub'
)
with check (
  caller_id = auth.jwt() ->> 'sub'
  or receiver_id = auth.jwt() ->> 'sub'
);

alter publication supabase_realtime add table public.calls;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('friend_request', 'friend_request_accepted', 'message', 'video_call', 'missed_call'));
