-- PrAjo admin upgrade, part 2: per-product numbers, customer status lookup, nightly settings backup.
-- Run once in Supabase -> SQL Editor. Safe to run again. (Run analytics-setup.sql first.)

create or replace function public.product_analytics(p_id text, p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb language plpgsql security definer set search_path = public as $$
declare bk text := case when p_bucket in ('hour','day','week','month') then p_bucket else 'day' end; r jsonb;
begin
  if not public.is_owner() then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'series', (select coalesce(jsonb_agg(x order by x.t), '[]'::jsonb) from (
        select date_trunc(bk, at at time zone 'America/Los_Angeles') as t,
          count(*) filter (where kind in ('product_view','design_view')) as views,
          coalesce(sum(qty) filter (where kind = 'add_to_cart'), 0) as adds
        from public.site_events where product_id = p_id and at >= p_from and at < p_to group by 1) x),
    'totals', (select jsonb_build_object(
        'views', count(*) filter (where kind in ('product_view','design_view')),
        'viewers', count(distinct sid) filter (where kind in ('product_view','design_view')),
        'adds', coalesce(sum(qty) filter (where kind = 'add_to_cart'), 0),
        'adders', count(distinct sid) filter (where kind = 'add_to_cart'),
        'orders', count(*) filter (where kind in ('purchase','design_submit')))
      from public.site_events where product_id = p_id and at >= p_from and at < p_to),
    'in_carts', (select count(*) from public.carts_live where items @> jsonb_build_array(jsonb_build_object('id', p_id)))
  ) into r;
  return r;
end $$;
revoke all on function public.product_analytics(text,timestamptz,timestamptz,text) from public, anon;
grant execute on function public.product_analytics(text,timestamptz,timestamptz,text) to authenticated;

-- A customer who has their reference code (e.g. D-AB12CD) can see only the status, never anything else.
create or replace function public.design_status(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('status', status, 'created_at', created_at, 'updated_at', updated_at, 'product', product, 'qty', qty, 'summary', left(summary, 120))
  from public.custom_designs where code = upper(trim(p_code)) limit 1
$$;
grant execute on function public.design_status(text) to anon, authenticated;

create table if not exists public.site_backups (
  id   bigint generated always as identity primary key,
  at   timestamptz not null default now(),
  data jsonb not null
);
alter table public.site_backups enable row level security;
drop policy if exists "owner reads backups" on public.site_backups;
create policy "owner reads backups" on public.site_backups for select to authenticated using (public.is_owner());
drop policy if exists "owner deletes backups" on public.site_backups;
create policy "owner deletes backups" on public.site_backups for delete to authenticated using (public.is_owner());

create or replace function public.backup_settings() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.site_backups (data) select data from public.site_settings where id = 1;
  delete from public.site_backups where id in (select id from public.site_backups order by id desc offset 60);
end $$;
revoke all on function public.backup_settings() from public, anon, authenticated;

do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('prajo-backup', '0 11 * * *', 'select public.backup_settings()');
exception when others then
  raise notice 'Nightly schedule not set (pg_cron not available): %', sqlerrm;
end $$;
select public.backup_settings();
