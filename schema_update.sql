-- DATUM Digital Cards: update for account settings.
-- Run this ONCE in Supabase > SQL Editor > New query > Run (after schema.sql).
-- It lets a logged-in user change their own User ID (card link).

-- 1) photos follow the card when its User ID changes
alter table public.photos drop constraint if exists photos_username_fkey;
alter table public.photos
  add constraint photos_username_fkey
  foreign key (username) references public.cards(username)
  on update cascade on delete cascade;

-- 2) the only way to rename: a function that can touch ONLY the caller's own card
create or replace function public.rename_card(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;
  if new_name !~ '^[a-z0-9_-]{3,24}$' then
    raise exception 'Invalid User ID';
  end if;
  update public.cards
     set username = new_name, updated_at = now()
   where owner_uid = auth.uid();
  if not found then
    raise exception 'No card found for this account';
  end if;
end;
$$;

revoke all on function public.rename_card(text) from public, anon;
grant execute on function public.rename_card(text) to authenticated;
