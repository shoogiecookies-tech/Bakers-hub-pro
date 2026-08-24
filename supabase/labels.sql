-- Run this in the Supabase SQL editor to create the labels table.
--
-- Stores a saved compliance label so a baker can reopen and reprint it without
-- rebuilding it field by field. Everything the Label Proofer needs to restore
-- its state lives here, plus a snapshot of the producer info that was on the
-- label when it was saved (so an old label still shows what was actually
-- printed, even if Settings change later).

create table labels (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,

  -- What it's for. Both nullable: a recipe or order can be deleted without
  -- destroying the record of a label that was already printed.
  recipe_id          bigint references recipes(id) on delete set null,
  order_id           bigint references orders(id) on delete set null,

  -- Baker-facing name in the saved-labels list.
  name               text not null,

  -- Proofer state, restored verbatim on reopen.
  size               text not null,               -- LABEL_SIZES.value, e.g. '5163'
  description        text default '',
  include_ingredients boolean not null default false,
  tcs                boolean not null default false,
  made_on            text default '',
  pcf                boolean not null default false, -- pickled / canned / fermented
  batch_no           text default '',
  quick_id_mode      boolean not null default false,
  quick_id_text      text,                        -- null = use the auto default
  quick_id_bold      boolean not null default true,

  -- Snapshot of what was actually printed, for the record.
  snapshot_product   text,
  snapshot_business  text,
  snapshot_idline    text,
  snapshot_allergens text[] default '{}',

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index labels_user_id_idx  on labels(user_id);
create index labels_recipe_id_idx on labels(recipe_id);
create index labels_created_at_idx on labels(user_id, created_at desc);

alter table labels enable row level security;

create policy "Users manage own labels" on labels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at honest on re-saves.
create or replace function set_labels_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger labels_updated_at
  before update on labels
  for each row execute function set_labels_updated_at();
