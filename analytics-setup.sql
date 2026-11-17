-- PrAjo admin upgrade: visitor analytics, live carts, and settings history.
-- Run once in Supabase -> SQL Editor. Safe to run again.
--
-- Visitors (not signed in) can ONLY call track_event / track_cart (they can't read anything).
-- The owner (your email + authenticator code, same rule as the rest of admin) reads everything.
-- No IP address is stored. A visitor is a random id kept in that browser; people who send
-- "Do Not Track" and your own signed-in admin browser are not counted.

create or replace function public.is_owner() returns boolean
language sql stable as $$
  select (auth.jwt() ->> 'email') = 'abhi.prasad85@gmail.com' and (auth.jwt() ->> 'aal') = 'aal2'
$$;

/* ---------- events ---------- */
create table if not exists public.site_events (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  sid        text not null check (char_length(sid) between 6 and 40),
  kind       text not null check (kind in ('view','product_view','add_to_cart','remove_from_cart','checkout_start','purchase','design_view','design_submit')),
  product_id text check (char_length(product_id) <= 120),
  page       text check (char_length(page) <= 40),
  ref        text check (char_length(ref) <= 120),
  device     text check (device in ('phone','tablet','desktop')),
  tz         text check (char_length(tz) <= 60),
  qty        int  check (qty between 0 and 500),
  value      numeric check (value between 0 and 100000)
);
create index if not exists site_events_at_idx   on public.site_events (at desc);
create index if not exists site_events_kind_idx on public.site_events (kind, at desc);
create index if not exists site_events_prod_idx on public.site_events (product_id) where product_id is not null;
alter table public.site_events enable row level security;
drop policy if exists "owner reads events" on public.site_events;
create policy "owner reads events" on public.site_events for select to authenticated using (public.is_owner());
drop policy if exists "owner deletes events" on public.site_events;
create policy "owner deletes events" on public.site_events for delete to authenticated using (public.is_owner());

create or replace function public.track_event(p_sid text, p_kind text, p_product text default null, p_page text default null,
  p_ref text default null, p_device text default null, p_tz text default null, p_qty int default null, p_value numeric default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_sid is null or char_length(p_sid) not between 6 and 40 then return; end if;
  if p_kind not in ('view','product_view','add_to_cart','remove_from_cart','checkout_start','purchase','design_view','design_submit') then return; end if;
  insert into public.site_events (sid, kind, product_id, page, ref, device, tz, qty, value)
  values (p_sid, p_kind, left(p_product, 120), left(p_page, 40), left(p_ref, 120),
          case when p_device in ('phone','tablet','desktop') then p_device end, left(p_tz, 60),
          least(greatest(coalesce(p_qty, 1), 0), 500), least(greatest(p_value, 0), 100000));
end $$;
grant execute on function public.track_event(text,text,text,text,text,text,text,int,numeric) to anon, authenticated;

/* ---------- carts people are holding right now ---------- */
create table if not exists public.carts_live (
  sid        text primary key check (char_length(sid) between 6 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  items      jsonb not null default '[]' check (pg_column_size(items) < 20000),
  item_count int  not null default 0,
  total      numeric not null default 0,
  email      text check (email is null or (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200)),
  device     text,
  tz         text check (char_length(tz) <= 60),
  contacted  timestamptz
);
create index if not exists carts_live_upd_idx on public.carts_live (updated_at desc);
alter table public.carts_live enable row level security;
drop policy if exists "owner manages carts" on public.carts_live;
create policy "owner manages carts" on public.carts_live for all to authenticated using (public.is_owner()) with check (public.is_owner());

create or replace function public.track_cart(p_sid text, p_items jsonb, p_total numeric, p_count int, p_email text default null,
  p_device text default null, p_tz text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_sid is null or char_length(p_sid) not between 6 and 40 then return; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    delete from public.carts_live where sid = p_sid; return;
  end if;
  if pg_column_size(p_items) >= 20000 then return; end if;
  insert into public.carts_live (sid, items, item_count, total, email, device, tz)
  values (p_sid, p_items, least(greatest(coalesce(p_count, 0), 0), 999), least(greatest(coalesce(p_total, 0), 0), 100000),
          nullif(left(p_email, 200), ''), p_device, left(p_tz, 60))
  on conflict (sid) do update set items = excluded.items, item_count = excluded.item_count, total = excluded.total,
    email = coalesce(nullif(excluded.email, ''), public.carts_live.email), updated_at = now();
exception when check_violation then null;
end $$;
grant execute on function public.track_cart(text,jsonb,numeric,int,text,text,text) to anon, authenticated;

/* ---------- report numbers (owner only) ---------- */
create or replace function public.site_analytics(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb language plpgsql security definer set search_path = public as $$
declare bk text := case when p_bucket in ('hour','day','week','month') then p_bucket else 'day' end; r jsonb;
begin
  if not public.is_owner() then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'series', (select coalesce(jsonb_agg(x order by x.t), '[]'::jsonb) from (
        select date_trunc(bk, at at time zone 'America/Los_Angeles') as t,
          count(distinct sid) filter (where kind = 'view') as visitors,
          count(*) filter (where kind = 'view') as views,
          count(*) filter (where kind in ('product_view','design_view')) as product_views,
          count(*) filter (where kind = 'add_to_cart') as adds,
          count(*) filter (where kind = 'checkout_start') as checkouts,
          count(*) filter (where kind in ('purchase','design_submit')) as orders
        from public.site_events where at >= p_from and at < p_to group by 1) x),
    'totals', (select jsonb_build_object(
        'visitors', count(distinct sid) filter (where kind = 'view'),
        'views', count(*) filter (where kind = 'view'),
        'product_views', count(*) filter (where kind in ('product_view','design_view')),
        'adds', count(*) filter (where kind = 'add_to_cart'),
        'checkouts', count(*) filter (where kind = 'checkout_start'),
        'orders', count(*) filter (where kind in ('purchase','design_submit')),
        'returning', (select count(distinct sid) from public.site_events e where e.kind = 'view' and e.at >= p_from and e.at < p_to
                       and exists (select 1 from public.site_events o where o.sid = e.sid and o.at < p_from)))
      from public.site_events where at >= p_from and at < p_to),
    'products', (select coalesce(jsonb_agg(x order by x.views desc), '[]'::jsonb) from (
        select product_id as id,
          count(*) filter (where kind in ('product_view','design_view')) as views,
          count(distinct sid) filter (where kind in ('product_view','design_view')) as viewers,
          coalesce(sum(qty) filter (where kind = 'add_to_cart'), 0) as adds,
          count(distinct sid) filter (where kind = 'add_to_cart') as adders,
          count(*) filter (where kind in ('purchase','design_submit')) as orders
        from public.site_events where at >= p_from and at < p_to and product_id is not null and kind in ('product_view','design_view','add_to_cart','design_submit')
        group by 1 order by 2 desc limit 60) x),
    'sources', (select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select coalesce(nullif(ref, ''), 'Direct') as name, count(distinct sid) as n from public.site_events
        where kind = 'view' and at >= p_from and at < p_to group by 1 order by 2 desc limit 12) x),
    'devices', (select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select coalesce(device, 'unknown') as name, count(distinct sid) as n from public.site_events
        where kind = 'view' and at >= p_from and at < p_to group by 1) x),
    'pages', (select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select coalesce(page, 'other') as name, count(*) as n from public.site_events
        where kind = 'view' and at >= p_from and at < p_to group by 1 order by 2 desc limit 10) x),
    'places', (select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select coalesce(nullif(tz, ''), 'Unknown') as name, count(distinct sid) as n from public.site_events
        where kind = 'view' and at >= p_from and at < p_to group by 1 order by 2 desc limit 10) x)
  ) into r;
  return r;
end $$;
revoke all on function public.site_analytics(timestamptz,timestamptz,text) from public, anon;
grant execute on function public.site_analytics(timestamptz,timestamptz,text) to authenticated;

/* ---------- settings history: every save of site_settings keeps what it replaced ---------- */
create table if not exists public.site_settings_history (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  by_email text,
  changed  text[] not null default '{}',
  old      jsonb not null default '{}'
);
create index if not exists site_settings_history_at_idx on public.site_settings_history (at desc);
alter table public.site_settings_history enable row level security;
drop policy if exists "owner reads history" on public.site_settings_history;
create policy "owner reads history" on public.site_settings_history for select to authenticated using (public.is_owner());
drop policy if exists "owner deletes history" on public.site_settings_history;
create policy "owner deletes history" on public.site_settings_history for delete to authenticated using (public.is_owner());

create or replace function public.site_settings_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare ch text[];
begin
  if old.data is not distinct from new.data then return new; end if;
  select coalesce(array_agg(k order by k), '{}') into ch from (
    select k from jsonb_object_keys(coalesce(old.data, '{}'::jsonb)) k
    union select k from jsonb_object_keys(coalesce(new.data, '{}'::jsonb)) k) a
  where (coalesce(old.data, '{}'::jsonb) -> k) is distinct from (coalesce(new.data, '{}'::jsonb) -> k);
  insert into public.site_settings_history (by_email, changed, old) values (auth.jwt() ->> 'email', ch, coalesce(old.data, '{}'::jsonb));
  delete from public.site_settings_history where id in (select id from public.site_settings_history order by id desc offset 300);
  return new;
end $$;
drop trigger if exists site_settings_log on public.site_settings;
create trigger site_settings_log after update on public.site_settings for each row execute function public.site_settings_log();

/* ---------- optional: clear old events (run when you want, keeps the last 400 days) ----------
-- delete from public.site_events where at < now() - interval '400 days';
*/
