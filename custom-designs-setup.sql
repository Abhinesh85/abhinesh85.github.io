-- Custom designs from the store's Design studio (design.html).
-- Run this once in Supabase → SQL Editor. Safe to run again.
--
-- Customers (not signed in) can ONLY add a new design and upload its pictures.
-- They cannot read, change or delete anything. You read and manage designs from admin.html
-- once signed in with your owner email and authenticator code.

create table if not exists public.custom_designs (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^D-[A-Z0-9]{6,8}$'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  status         text not null default 'new'
                 check (status in ('new','reviewing','quoted','approved','in_production','done','cancelled')),
  product        text not null check (char_length(product) <= 30),
  summary        text not null default '' check (char_length(summary) <= 600),
  design         jsonb not null check (pg_column_size(design) < 200000),
  preview_path   text check (char_length(preview_path) <= 200),
  customer_name  text not null check (char_length(customer_name) between 1 and 100),
  customer_email text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(customer_email) <= 200),
  customer_phone text check (char_length(customer_phone) <= 40),
  qty            int  not null default 1 check (qty between 1 and 500),
  needed_by      date,
  notes          text check (char_length(notes) <= 2000),
  owner_notes    text,
  notified       boolean not null default false
);

create index if not exists custom_designs_created_idx on public.custom_designs (created_at desc);

alter table public.custom_designs enable row level security;

-- Table privileges. Row-level security only filters rows; without these grants Postgres answers
-- "permission denied for table custom_designs" before any policy is checked (newer Supabase projects
-- no longer grant new tables to the API roles automatically).
grant insert on public.custom_designs to anon;
grant select, insert, update, delete on public.custom_designs to authenticated;
grant all on public.custom_designs to service_role;

drop policy if exists "customers add designs" on public.custom_designs;
create policy "customers add designs" on public.custom_designs
  for insert to anon, authenticated
  with check (status = 'new' and notified = false and owner_notes is null);

-- The owner sees and edits everything (same rule as the admin page: owner email + authenticator code).
drop policy if exists "owner manages designs" on public.custom_designs;
create policy "owner manages designs" on public.custom_designs
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'abhi.prasad85@gmail.com' and (auth.jwt() ->> 'aal') = 'aal2')
  with check ((auth.jwt() ->> 'email') = 'abhi.prasad85@gmail.com' and (auth.jwt() ->> 'aal') = 'aal2');

create or replace function public.custom_designs_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists custom_designs_touch on public.custom_designs;
create trigger custom_designs_touch before update on public.custom_designs
  for each row execute function public.custom_designs_touch();

-- Private picture storage: previews and customer-uploaded images, in a folder named after the design code.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-previews', 'design-previews', false, 4194304, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 4194304,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "customers upload design pictures" on storage.objects;
create policy "customers upload design pictures" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'design-previews' and (storage.foldername(name))[1] ~ '^D-[A-Z0-9]{6,8}$');

drop policy if exists "owner reads design pictures" on storage.objects;
create policy "owner reads design pictures" on storage.objects
  for select to authenticated
  using (bucket_id = 'design-previews' and (auth.jwt() ->> 'email') = 'abhi.prasad85@gmail.com' and (auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists "owner removes design pictures" on storage.objects;
create policy "owner removes design pictures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'design-previews' and (auth.jwt() ->> 'email') = 'abhi.prasad85@gmail.com' and (auth.jwt() ->> 'aal') = 'aal2');
