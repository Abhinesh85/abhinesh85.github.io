-- PrAjo admin upgrade, part 6: who visits. One row per visit with approximate place (country, region, city, ZIP),
-- where they came from, how long they stayed and how many pages they saw.
-- Run once in Supabase -> SQL Editor. Safe to run again. Needs part 1 (is_owner) first.
--
-- Privacy: the visitor's IP address is NOT stored. The store asks a small Cloudflare Worker for the approximate place
-- (worked out from the IP in memory and thrown away) and saves only that. Skipped for "Do Not Track" / Global Privacy
-- Control, for people in the EU/UK until they accept, and for your own signed-in browser. Rows older than 400 days are deleted.

create table if not exists public.site_visits (
  vid        text primary key check (char_length(vid) between 6 and 40),   -- one visit (a browser tab session)
  sid        text not null check (char_length(sid) between 6 and 40),      -- the same visitor across visits
  started_at timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  seconds    int  not null default 0 check (seconds between 0 and 43200),  -- time the page was actually on screen
  pages      int  not null default 1 check (pages between 0 and 500),
  country    text check (country is null or country ~ '^[A-Z]{2}$'),
  region     text check (char_length(region) <= 80),
  city       text check (char_length(city) <= 80),
  zip        text check (char_length(zip) <= 12),
  ref        text check (char_length(ref) <= 120),                         -- website they came from (host only)
  landing    text check (char_length(landing) <= 40),                      -- first page of the visit
  medium     text check (char_length(medium) <= 40),                       -- utm_medium
  campaign   text check (char_length(campaign) <= 60),                     -- utm_campaign
  device     text check (device in ('phone','tablet','desktop')),
  tz         text check (char_length(tz) <= 60),
  "returning"  boolean not null default false
);
create index if not exists site_visits_started_idx on public.site_visits (started_at desc);
create index if not exists site_visits_sid_idx on public.site_visits (sid);
alter table public.site_visits enable row level security;
drop policy if exists "owner reads visits" on public.site_visits;
create policy "owner reads visits" on public.site_visits for select to authenticated using (public.is_owner());
drop policy if exists "owner deletes visits" on public.site_visits;
create policy "owner deletes visits" on public.site_visits for delete to authenticated using (public.is_owner());
grant select, delete on public.site_visits to authenticated;
grant all on public.site_visits to service_role;

create or replace function public.track_visit(p_vid text, p_sid text, p_seconds int default 0, p_pages int default 1,
  p_country text default null, p_region text default null, p_city text default null, p_zip text default null,
  p_ref text default null, p_landing text default null, p_medium text default null, p_campaign text default null,
  p_device text default null, p_tz text default null, p_returning boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_vid is null or char_length(p_vid) not between 6 and 40 then return; end if;
  if p_sid is null or char_length(p_sid) not between 6 and 40 then return; end if;
  insert into public.site_visits (vid, sid, seconds, pages, country, region, city, zip, ref, landing, medium, campaign, device, tz, "returning")
  values (p_vid, p_sid, least(greatest(coalesce(p_seconds, 0), 0), 43200), least(greatest(coalesce(p_pages, 1), 0), 500),
          case when upper(p_country) ~ '^[A-Z]{2}$' then upper(p_country) end, nullif(left(p_region, 80), ''), nullif(left(p_city, 80), ''), nullif(left(p_zip, 12), ''),
          nullif(left(p_ref, 120), ''), nullif(left(p_landing, 40), ''), nullif(left(p_medium, 40), ''), nullif(left(p_campaign, 60), ''),
          case when p_device in ('phone','tablet','desktop') then p_device end, left(p_tz, 60), coalesce(p_returning, false))
  on conflict (vid) do update set
    last_seen = now(),
    seconds   = greatest(public.site_visits.seconds, excluded.seconds),
    pages     = greatest(public.site_visits.pages, excluded.pages),
    country   = coalesce(public.site_visits.country, excluded.country),
    region    = coalesce(public.site_visits.region, excluded.region),
    city      = coalesce(public.site_visits.city, excluded.city),
    zip       = coalesce(public.site_visits.zip, excluded.zip)
  where public.site_visits.sid = excluded.sid;
exception when check_violation then null;
end $$;
revoke all on function public.track_visit(text,text,int,int,text,text,text,text,text,text,text,text,text,text,boolean) from public;
grant execute on function public.track_visit(text,text,int,int,text,text,text,text,text,text,text,text,text,text,boolean) to anon, authenticated;

/* ---------- report numbers (owner only) ---------- */
create or replace function public.visitor_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_owner() then raise exception 'not allowed'; end if;
  with v as (select * from public.site_visits where started_at >= p_from and started_at < p_to)
  select jsonb_build_object(
    'totals', (select jsonb_build_object('visits', count(*), 'visitors', count(distinct sid),
        'avg_seconds', coalesce(round(avg(seconds) filter (where seconds > 0)), 0),
        'avg_pages', coalesce(round(avg(pages)::numeric, 1), 0),
        'bounced', count(*) filter (where pages <= 1 and seconds < 15),
        'returning', count(*) filter (where "returning")) from v),
    'countries', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select coalesce(country, '??') as name, count(*) as n, round(avg(seconds) filter (where seconds > 0)) as secs
        from v group by 1 order by 2 desc limit 15) x),
    'regions', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select coalesce(region, 'Unknown') as name, coalesce(country, '??') as country, count(*) as n
        from v group by 1, 2 order by 3 desc limit 20) x),
    'cities', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select city as name, coalesce(region, '') as region, coalesce(country, '??') as country, count(*) as n, round(avg(seconds) filter (where seconds > 0)) as secs
        from v where city is not null group by 1, 2, 3 order by 4 desc limit 25) x),
    'zips', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select zip as name, coalesce(city, '') as city, coalesce(region, '') as region, count(*) as n
        from v where zip is not null group by 1, 2, 3 order by 4 desc limit 25) x),
    'sources', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select coalesce(nullif(ref, ''), 'Direct or unknown') as name, count(*) as n, round(avg(seconds) filter (where seconds > 0)) as secs, round(avg(pages)::numeric, 1) as pages
        from v group by 1 order by 2 desc limit 20) x),
    'landings', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select coalesce(landing, 'home') as name, count(*) as n
        from v group by 1 order by 2 desc limit 10) x),
    'recent', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select vid, sid, started_at, last_seen, seconds, pages, country, region, city, zip, ref, landing, medium, campaign, device, "returning"
        from v order by started_at desc limit 150) x)
  ) into r;
  return r;
end $$;
revoke all on function public.visitor_report(timestamptz,timestamptz) from public, anon;
grant execute on function public.visitor_report(timestamptz,timestamptz) to authenticated;

/* ---------- keep it tidy: delete visits older than 400 days, every night ---------- */
do $$ begin
  perform cron.schedule('prajo-purge-visits', '17 3 * * *', $c$delete from public.site_visits where started_at < now() - interval '400 days'$c$);
exception when others then raise notice 'pg_cron not available: delete old rows by hand, or skip this step (%).', sqlerrm;
end $$;
