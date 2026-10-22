-- Shaxsiy messenjer sxemasi. Supabase → SQL Editor ichida bir marta ishga tushiring.
-- Foydalanuvchi shaxsi: Edge Function (telegram-auth) bergan JWT ichidagi `tg_id` claim.

create table if not exists public.profiles (
    tg_id       bigint primary key,
    first_name  text not null default '',
    last_name   text not null default '',
    username    text,
    photo_url   text,
    last_seen   timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles (lower(username));

create table if not exists public.messages (
    id          uuid primary key default gen_random_uuid(),
    sender_id   bigint not null references public.profiles(tg_id),
    receiver_id bigint not null references public.profiles(tg_id),
    body        text not null check (char_length(body) between 1 and 4000),
    created_at  timestamptz not null default now(),
    read_at     timestamptz,
    check (sender_id <> receiver_id)
);
create index if not exists messages_pair_idx on public.messages (sender_id, receiver_id, created_at desc);
create index if not exists messages_rcv_idx  on public.messages (receiver_id, created_at desc);

create or replace function public.tg_id() returns bigint
language sql stable as $$ select nullif(auth.jwt() ->> 'tg_id', '')::bigint $$;

alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- Profillarni faqat Edge Function (service role) yozadi; mijozlar o'qiy oladi (qidiruv uchun).
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);

-- Xabarni faqat yuboruvchi yoki qabul qiluvchi ko'radi.
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
    using (tg_id() in (sender_id, receiver_id));

-- Faqat o'z nomidan yuborish mumkin.
drop policy if exists messages_send on public.messages;
create policy messages_send on public.messages for insert to authenticated
    with check (sender_id = tg_id());

-- Qabul qiluvchi faqat read_at ustunini yangilay oladi.
drop policy if exists messages_mark_read on public.messages;
create policy messages_mark_read on public.messages for update to authenticated
    using (receiver_id = tg_id()) with check (receiver_id = tg_id());
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Real-time uchun.
alter publication supabase_realtime add table public.messages;
