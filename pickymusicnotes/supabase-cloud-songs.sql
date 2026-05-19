create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    is_admin boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.songs (
    id text primary key,
    owner_id uuid not null references auth.users(id) on delete cascade,
    owner_name text not null,
    title text not null default 'Untitled Song',
    artist text not null default 'Artist',
    payload jsonb not null,
    is_online boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

do $$
begin
    if to_regclass('public.cloud_songs') is not null then
        insert into public.songs (id, owner_id, owner_name, title, artist, payload, is_online, created_at, updated_at)
        select id, owner_id, owner_name, title, artist, payload, true, created_at, updated_at
        from public.cloud_songs
        on conflict (id) do update set
            owner_id = excluded.owner_id,
            owner_name = excluded.owner_name,
            title = excluded.title,
            artist = excluded.artist,
            payload = excluded.payload,
            is_online = excluded.is_online,
            updated_at = excluded.updated_at;
    end if;
end $$;

alter table public.profiles enable row level security;
alter table public.songs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.songs to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.songs to authenticated;

create or replace function public.is_song_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and is_admin = true
    );
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    delete from auth.users
    where id = auth.uid();
end;
$$;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users update their own profile name" on public.profiles;
create policy "Users update their own profile name"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and is_admin = false);

drop policy if exists "Anyone can read online songs" on public.songs;
create policy "Anyone can read online songs"
on public.songs for select
to anon, authenticated
using (is_online = true);

drop policy if exists "Owners and admins can read personal songs" on public.songs;
create policy "Owners and admins can read personal songs"
on public.songs for select
to authenticated
using ((select auth.uid()) = owner_id or public.is_song_admin());

drop policy if exists "Owners can create songs" on public.songs;
create policy "Owners can create songs"
on public.songs for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners and admins can update songs" on public.songs;
create policy "Owners and admins can update songs"
on public.songs for update
to authenticated
using ((select auth.uid()) = owner_id or public.is_song_admin())
with check ((select auth.uid()) = owner_id or public.is_song_admin());

drop policy if exists "Owners and admins can delete songs" on public.songs;
create policy "Owners and admins can delete songs"
on public.songs for delete
to authenticated
using ((select auth.uid()) = owner_id or public.is_song_admin());

create index if not exists songs_owner_id_idx on public.songs(owner_id);
create index if not exists songs_is_online_updated_at_idx on public.songs(is_online, updated_at desc);

grant execute on function public.is_song_admin() to authenticated;
grant execute on function public.delete_own_account() to authenticated;

-- After you create your own account, run this once with your real email:
-- update public.profiles
-- set is_admin = true, display_name = 'Wessel'
-- where id = (select id from auth.users where email = 'you@example.com');
