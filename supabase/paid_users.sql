-- Run this in the Supabase SQL editor to create the paid_users table.

create table if not exists paid_users (
  id              uuid        default gen_random_uuid() primary key,
  email           text        unique not null,
  stripe_customer_id text,
  purchased_at    timestamptz,
  created_at      timestamptz default now()
);

alter table paid_users enable row level security;

-- Anon users can check whether their email exists (needed for signup guard in the frontend).
create policy "anon_select" on paid_users
  for select to anon using (true);

-- Only the service role (used by the webhook) can insert or update rows.
create policy "service_role_all" on paid_users
  for all to service_role using (true);
