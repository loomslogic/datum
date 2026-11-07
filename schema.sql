-- DATUM Digital Cards: run this once in Supabase > SQL Editor > New query > Run.

create table if not exists public.cards (
  username   text primary key check (username ~ '^[a-z0-9_-]{3,24}$'),
  owner_uid  uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- one card per account
create unique index if not exists cards_owner_idx on public.cards(owner_uid);

create table if not exists public.photos (
  id         uuid primary key default gen_random_uuid(),
  username   text not null references public.cards(username) on delete cascade,
  data       text not null check (length(data) < 900000),
  created_at timestamptz not null default now()
);
create index if not exists photos_username_idx on public.photos(username);

alter table public.cards  enable row level security;
alter table public.photos enable row level security;

-- Anyone can VIEW cards and photos (they are public pages)
create policy "cards are public"  on public.cards  for select using (true);
create policy "photos are public" on public.photos for select using (true);

-- Only a logged-in user can create THEIR OWN card (username is claimed by the primary key, first come first served)
create policy "create own card" on public.cards for insert to authenticated
  with check (owner_uid = auth.uid());

-- Only the owner can edit or delete their card
create policy "edit own card" on public.cards for update to authenticated
  using (owner_uid = auth.uid()) with check (owner_uid = auth.uid());
create policy "delete own card" on public.cards for delete to authenticated
  using (owner_uid = auth.uid());

-- Only the owner of the card can add / change / remove its photos
create policy "add own photos" on public.photos for insert to authenticated
  with check (exists (select 1 from public.cards c where c.username = photos.username and c.owner_uid = auth.uid()));
create policy "edit own photos" on public.photos for update to authenticated
  using (exists (select 1 from public.cards c where c.username = photos.username and c.owner_uid = auth.uid()))
  with check (exists (select 1 from public.cards c where c.username = photos.username and c.owner_uid = auth.uid()));
create policy "delete own photos" on public.photos for delete to authenticated
  using (exists (select 1 from public.cards c where c.username = photos.username and c.owner_uid = auth.uid()));

-- Extra safety: logged-out visitors can only read; owners can't rename a card or hand it to someone else
revoke insert, update, delete on public.cards, public.photos from anon;
revoke update on public.cards from authenticated;
grant update (data, updated_at) on public.cards to authenticated;
