-- CarOne bookings storage
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  -- Booking
  workshop              text,
  service               text,
  addons                text,
  drop_off_time         text,
  is_flexible           boolean default false,
  note                  text,

  -- Vehicle
  registration_number   text,
  state                 text,
  make                  text,
  model                 text,
  year                  text,
  vin                   text,

  -- Contact
  name                  text,
  phone                 text,
  email                 text,
  vip_number            text,

  -- Marketing attribution
  page_url              text,
  parent_page_url       text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  utm_content           text,
  utm_term              text,
  utm_ad                text,
  utm_campaign_id       text,
  utm_adgroupid         text,
  ad_id                 text,
  matchtype             text,
  utm_device            text,
  utm_geoloc            text,
  utm_placement         text,
  utm_network           text,

  -- MechanicDesk sync
  mechanicdesk_status   text default 'pending',   -- pending | sent | failed
  mechanicdesk_ref      text,
  mechanicdesk_response jsonb,
  synced_at             timestamptz
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_workshop_idx    on public.bookings (workshop);
create index if not exists bookings_status_idx      on public.bookings (mechanicdesk_status);

-- Lock the table down: the backend uses the service-role key (which bypasses RLS),
-- so with RLS enabled and no policies, nothing else (anon/public) can read or write.
alter table public.bookings enable row level security;
