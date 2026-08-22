-- Run this in the Supabase SQL editor to create the payments table.
-- Tracks actual money received against an order (deposits + balance), separate
-- from orders.status (which tracks fulfillment, not payment).

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  method text, -- 'Venmo' | 'PayPal' | 'Zelle' | 'Cash' | 'Other'
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index payments_order_id_idx on payments(order_id);

alter table payments enable row level security;

create policy "Users manage own payments" on payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
