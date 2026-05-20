create table if not exists public.user_presence (
  user_id text primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  last_seen timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_presence enable row level security;

drop policy if exists "Users can read presence" on public.user_presence;
create policy "Users can read presence"
on public.user_presence
for select
to authenticated
using (true);

drop policy if exists "Users can upsert own presence" on public.user_presence;
create policy "Users can upsert own presence"
on public.user_presence
for insert
to authenticated
with check (
  user_id = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can update own presence" on public.user_presence;
create policy "Users can update own presence"
on public.user_presence
for update
to authenticated
using (
  user_id = auth.jwt() ->> 'sub'
)
with check (
  user_id = auth.jwt() ->> 'sub'
);

alter publication supabase_realtime add table public.user_presence;
