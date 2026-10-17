update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'project-media';

create table public.project_media_cleanup (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.project_media_cleanup enable row level security;

create policy "Designated administrator can manage project media cleanup"
  on public.project_media_cleanup
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());

grant select, insert, update, delete on public.project_media_cleanup to authenticated;

create or replace function public.validate_project_media_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  object_mime text;
  object_size bigint;
  still_image_count integer;
  gif_count integer;
begin
  if btrim(coalesce(new.alt_text, '')) = '' then
    raise exception 'Alt text is required for every project image' using errcode = '23514';
  end if;

  perform 1 from public.projects where id = new.project_id for update;
  if not found then
    raise exception 'The project does not exist' using errcode = '23503';
  end if;

  select objects.metadata ->> 'mimetype', nullif(objects.metadata ->> 'size', '')::bigint
    into object_mime, object_size
  from storage.objects as objects
  where objects.bucket_id = 'project-media'
    and objects.name = new.storage_path;

  if not found or object_mime is null or object_size is null then
    raise exception 'Upload the project image to Storage before saving its media record' using errcode = '23514';
  end if;

  if object_mime = 'image/gif' then
    if object_size <= 0 or object_size > 10485760 then
      raise exception 'GIF files must be larger than zero and no more than 10 MB' using errcode = '23514';
    end if;
    new.media_type := 'gif';
  elsif object_mime in ('image/jpeg', 'image/png', 'image/webp') then
    if object_size <= 0 or object_size > 5242880 then
      raise exception 'JPG, PNG, and WebP files must be larger than zero and no more than 5 MB' using errcode = '23514';
    end if;
    new.media_type := 'still_image';
  else
    raise exception 'Only JPG, PNG, WebP, and GIF files are accepted' using errcode = '23514';
  end if;

  if split_part(new.storage_path, '/', 1) <> new.project_id::text then
    raise exception 'Project media must be stored in its project folder' using errcode = '23514';
  end if;

  new.mime_type := object_mime;
  new.size_bytes := object_size;
  new.alt_text := btrim(new.alt_text);

  select
    count(*) filter (where media_type = 'still_image'),
    count(*) filter (where media_type = 'gif')
  into still_image_count, gif_count
  from public.project_media
  where project_id = new.project_id
    and id is distinct from new.id;

  if new.media_type = 'still_image' and still_image_count >= 10 then
    raise exception 'A project can have at most 10 still images' using errcode = '23514';
  end if;
  if new.media_type = 'gif' and gif_count >= 2 then
    raise exception 'A project can have at most 2 GIFs' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger validate_project_media_object_before_write
before insert or update of project_id, storage_path, media_type, mime_type, size_bytes, alt_text
on public.project_media
for each row execute function public.validate_project_media_object();

create or replace function public.set_admin_project_media_main(p_media_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project_id uuid;
begin
  if not public.is_designated_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select project_id into target_project_id
  from public.project_media
  where id = p_media_id;

  if target_project_id is null then
    raise exception 'Project media was not found' using errcode = 'P0002';
  end if;

  perform 1 from public.projects where id = target_project_id for update;
  update public.project_media set is_main = false where project_id = target_project_id and is_main;
  update public.project_media set is_main = true where id = p_media_id;
end;
$$;

revoke all on function public.set_admin_project_media_main(uuid) from public, anon;
grant execute on function public.set_admin_project_media_main(uuid) to authenticated;

create or replace function public.save_admin_project_media_order(p_project_id uuid, p_media_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
begin
  if not public.is_designated_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select count(*) into expected_count
  from public.project_media
  where project_id = p_project_id;

  if coalesce(cardinality(p_media_ids), 0) <> expected_count
    or (select count(distinct id) from unnest(coalesce(p_media_ids, '{}'::uuid[])) as requested(id)) <> expected_count
    or exists (
      select 1
      from unnest(coalesce(p_media_ids, '{}'::uuid[])) as requested(id)
      left join public.project_media as media on media.id = requested.id and media.project_id = p_project_id
      where media.id is null
    ) then
    raise exception 'The media order must include every image from this project exactly once' using errcode = '22023';
  end if;

  update public.project_media as media
  set sort_order = requested.ordinality::integer
  from unnest(coalesce(p_media_ids, '{}'::uuid[])) with ordinality as requested(id, ordinality)
  where media.id = requested.id and media.project_id = p_project_id;
end;
$$;

revoke all on function public.save_admin_project_media_order(uuid, uuid[]) from public, anon;
grant execute on function public.save_admin_project_media_order(uuid, uuid[]) to authenticated;

create or replace function public.keep_project_media_main_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_media_id uuid;
begin
  if old.is_main then
    select id into next_media_id
    from public.project_media
    where project_id = old.project_id
    order by sort_order, created_at, id
    limit 1;
    if next_media_id is not null then
      update public.project_media set is_main = true where id = next_media_id;
    end if;
  end if;
  return old;
end;
$$;

create trigger keep_project_media_main_after_delete
after delete on public.project_media
for each row execute function public.keep_project_media_main_after_delete();
