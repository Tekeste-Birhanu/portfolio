create table public.profile_media_cleanup (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null check (bucket_id in ('profile-photo', 'profile-cv')),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profile_media_cleanup enable row level security;

create policy "Designated administrator can manage profile media cleanup"
  on public.profile_media_cleanup
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());

grant select, insert, update, delete on public.profile_media_cleanup to authenticated;

create or replace function public.prevent_nonempty_skill_category_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.skills where category_id = old.id) then
    raise exception 'Move or remove skills before deleting this category' using errcode = '23503';
  end if;
  return old;
end;
$$;

revoke all on function public.prevent_nonempty_skill_category_delete() from public, anon, authenticated;

create trigger prevent_nonempty_skill_category_delete_trigger
before delete on public.skill_categories
for each row execute function public.prevent_nonempty_skill_category_delete();
