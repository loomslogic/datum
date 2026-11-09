-- DATUM Digital Cards: permanent NFC links + moderator-only account creation.
-- Run this ONCE in Supabase > SQL Editor > New query > Run (after schema.sql and schema_update.sql).

-- 1) A permanent public id for every card. NFC cards use ?c=<public_id>, which never changes,
--    even if the User ID (username) is renamed later.
alter table public.cards add column if not exists public_id text;
update public.cards set public_id = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) where public_id is null;
alter table public.cards alter column public_id set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
alter table public.cards alter column public_id set not null;
create unique index if not exists cards_public_id_idx on public.cards(public_id);
-- (users can still only update data + updated_at, so public_id can never be edited)

-- 2) Moderators
create table if not exists public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.moderators enable row level security;
drop policy if exists "moderators read own row" on public.moderators;
create policy "moderators read own row" on public.moderators for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.moderators from anon, authenticated;

-- 3) Nobody can create a card by themselves any more. Cards are created only by the
--    create-user function (which checks that the caller is a moderator).
drop policy if exists "create own card" on public.cards;
revoke insert on public.cards from anon, authenticated;

-- 4) Make your account a moderator (the account must already exist: Authentication > Users)
insert into public.moderators (user_id)
select id from auth.users where lower(email) = 'argiebendanillo987@gmail.com'
on conflict do nothing;

-- Should show one row. If it is empty, that email has no account yet.
select m.user_id, u.email from public.moderators m join auth.users u on u.id = m.user_id;
