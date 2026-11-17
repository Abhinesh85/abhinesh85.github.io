-- PrAjo admin upgrade, part 3: the website Inbox (mail sent to hello@, orders@, support@, proofs@ and replies).
-- Run once in Supabase -> SQL Editor. Safe to run again. Needs part 1 (is_owner) first.
create table if not exists public.inbox_messages (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  dir         text not null default 'in' check (dir in ('in','out')),
  mailbox     text not null default 'hello' check (char_length(mailbox) <= 30),
  thread      text not null check (char_length(thread) <= 300),
  peer_email  text check (char_length(peer_email) <= 200),
  peer_name   text check (char_length(peer_name) <= 200),
  subject     text check (char_length(subject) <= 500),
  body        text check (char_length(body) <= 60000),
  message_id  text check (char_length(message_id) <= 500),
  in_reply_to text check (char_length(in_reply_to) <= 500),
  status      text not null default 'new' check (status in ('new','open','done','spam')),
  link_code   text check (link_code is null or link_code ~ '^D-[A-Z0-9]{6,8}$'),
  tg_msg_id   bigint,
  sent_by     text,
  template    text
);
create unique index if not exists inbox_messages_mid_idx on public.inbox_messages (message_id) where message_id is not null;
create index if not exists inbox_messages_thread_idx on public.inbox_messages (thread, at);
create index if not exists inbox_messages_status_idx on public.inbox_messages (status, at desc);
create index if not exists inbox_messages_tg_idx on public.inbox_messages (tg_msg_id) where tg_msg_id is not null;
alter table public.inbox_messages enable row level security;
drop policy if exists "owner manages inbox" on public.inbox_messages;
create policy "owner manages inbox" on public.inbox_messages for all to authenticated using (public.is_owner()) with check (public.is_owner());
