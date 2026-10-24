-- AI Crisis Radar — production schema (Supabase / PostgreSQL)
--
-- Design: a document table keyed by (collection, id) with a JSONB payload.
-- The server writes with the service-role key only; RLS is defence-in-depth for
-- any direct client access. Shared intelligence is readable by authenticated
-- users, while user-scoped rows are limited to their owner. There are
-- deliberately NO insert/update/delete policies for anon/authenticated roles.

create extension if not exists "pgcrypto";

create table if not exists public.records (
  id          text primary key,
  collection  text not null,
  data        jsonb not null,
  owner_id    uuid null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.records is
  'Encrypted-at-rest application records. Writes only via the service role.';

create index if not exists records_collection_idx on public.records (collection);
create index if not exists records_owner_idx on public.records (owner_id);
create index if not exists records_data_gin on public.records using gin (data jsonb_path_ops);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists records_touch_updated_at on public.records;
create trigger records_touch_updated_at
before update on public.records
for each row execute function public.touch_updated_at();

-- Audit trail is append-only, including for the service role.
create or replace function public.protect_audit_log()
returns trigger language plpgsql as $$
begin
  if old.collection = 'auditLogs' then
    raise exception 'audit log records are immutable';
  end if;
  return old;
end;
$$;

drop trigger if exists records_protect_audit on public.records;
create trigger records_protect_audit
before update or delete on public.records
for each row execute function public.protect_audit_log();

alter table public.records enable row level security;
alter table public.records force row level security;

-- Shared intelligence: any authenticated team member can read.
drop policy if exists "shared intel readable" on public.records;
create policy "shared intel readable"
on public.records for select to authenticated
using (collection in ('events', 'sources', 'reports'));

-- User-scoped records: only the owner (or an admin, resolved server-side).
drop policy if exists "own rows readable" on public.records;
create policy "own rows readable"
on public.records for select to authenticated
using (owner_id = auth.uid());

-- Explicitly deny anonymous access.
drop policy if exists "deny anon" on public.records;
create policy "deny anon" on public.records for select to anon using (false);

grant select on public.records to authenticated;
revoke insert, update, delete on public.records from anon, authenticated;

-- Optional helper view for operational checks (no PII beyond email domain).
create or replace view public.record_counts
with (security_invoker = true) as
select collection, count(*)::int as total
from public.records
group by collection;

comment on view public.record_counts is
  'Counts per collection. RLS on public.records still applies.';
