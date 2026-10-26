-- Migration: atomic idempotency + booking state machine
-- STATUS: PREPARED — DO NOT run against production until reviewed and approved by Jai.
-- Apply in the Supabase SQL editor (Dashboard → SQL → New query → Run) on STAGING first.
--
-- Why: the create-booking route must be idempotent across *multiple backend
-- instances and restarts*, not just within one Node process. The unique index
-- on idempotency_key makes the database the single authoritative owner: the one
-- request whose INSERT succeeds owns the MechanicDesk submission; a concurrent
-- or retried request hits the unique violation, reads the existing row and
-- returns its current state WITHOUT calling MechanicDesk again.

alter table public.bookings
  add column if not exists idempotency_key uuid,
  add column if not exists booking_state    text not null default 'received',
  add column if not exists state_updated_at timestamptz,
  add column if not exists error_category   text;   -- privacy-safe: 'timeout' | 'md_rejected' | 'md_5xx' | 'network' | null

-- Allowed states of the MechanicDesk sync lifecycle.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_state_chk') then
    alter table public.bookings
      add constraint bookings_state_chk
      check (booking_state in ('received','syncing','confirmed','sync_failed','sync_unknown'));
  end if;
end $$;

-- Atomic ownership: at most one row per idempotency key (NULL allowed for legacy rows).
create unique index if not exists bookings_idempotency_key_uidx
  on public.bookings (idempotency_key)
  where idempotency_key is not null;

create index if not exists bookings_booking_state_idx
  on public.bookings (booking_state);

-- Rollback (manual, if ever needed):
--   drop index if exists bookings_idempotency_key_uidx;
--   drop index if exists bookings_booking_state_idx;
--   alter table public.bookings drop constraint if exists bookings_state_chk;
--   alter table public.bookings
--     drop column if exists idempotency_key,
--     drop column if exists booking_state,
--     drop column if exists state_updated_at,
--     drop column if exists error_category;
