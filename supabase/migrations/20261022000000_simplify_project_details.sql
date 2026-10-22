-- Keep legacy project detail columns intact while the application stops exposing
-- or changing them. New projects leave these unused columns at their defaults.
create or replace function public.save_admin_project(
  p_project_id uuid,
  p_project jsonb,
  p_technology_ids uuid[] default '{}',
  p_new_technology_names text[] default '{}'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_project_id uuid;
  project_name text;
  project_status text;
  base_slug text;
  normalized_slug text;
  candidate_slug text;
  current_slug text;
  previous_project_name text;
  technology_name text;
  technology_uuid uuid;
  new_sort_order integer;
  suffix integer := 1;
begin
  if not public.is_designated_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  project_name := btrim(coalesce(p_project ->> 'name', ''));
  project_status := p_project ->> 'status';
  if project_name = '' or btrim(coalesce(p_project ->> 'short_description', '')) = '' then
    raise exception 'Project name and description are required' using errcode = '22023';
  end if;
  if project_status is null or project_status not in ('planning', 'in_progress', 'completed') then
    raise exception 'Project status is invalid' using errcode = '22023';
  end if;
  if coalesce(p_project ->> 'repository_url', '') <> '' and (p_project ->> 'repository_url') !~* '^https?://[^[:space:]]+$' then
    raise exception 'Repository URL must use http or https' using errcode = '22023';
  end if;
  if coalesce(p_project ->> 'live_demo_url', '') <> '' and (p_project ->> 'live_demo_url') !~* '^https?://[^[:space:]]+$' then
    raise exception 'Live demo URL must use http or https' using errcode = '22023';
  end if;

  if p_project_id is null then
    select coalesce(max(sort_order), 0) + 1 into new_sort_order from public.projects;
    insert into public.projects (
      name, short_description, status, repository_url, live_demo_url, key_features, sort_order
    ) values (
      project_name, p_project ->> 'short_description', project_status,
      nullif(p_project ->> 'repository_url', ''), nullif(p_project ->> 'live_demo_url', ''),
      nullif(p_project ->> 'key_features', ''), new_sort_order
    ) returning id into saved_project_id;
  else
    select name into previous_project_name from public.projects where id = p_project_id;
    update public.projects set
      name = project_name,
      short_description = p_project ->> 'short_description',
      status = project_status,
      repository_url = nullif(p_project ->> 'repository_url', ''),
      live_demo_url = nullif(p_project ->> 'live_demo_url', ''),
      key_features = nullif(p_project ->> 'key_features', ''),
      updated_at = now()
    where id = p_project_id returning id into saved_project_id;
    if saved_project_id is null then
      raise exception 'Project not found' using errcode = 'P0002';
    end if;
  end if;

  select slug into current_slug from public.project_slugs
  where project_id = saved_project_id and is_current;

  normalized_slug := nullif(lower(regexp_replace(regexp_replace(btrim(project_name), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')), '');
  normalized_slug := coalesce(normalized_slug, 'project');
  if current_slug is null or (previous_project_name is distinct from project_name and current_slug <> normalized_slug) then
    base_slug := normalized_slug;
    candidate_slug := base_slug;
    suffix := 1;
    while exists (select 1 from public.project_slugs where slug = candidate_slug and project_id <> saved_project_id) loop
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    end loop;
    update public.project_slugs set is_current = false where project_id = saved_project_id and is_current;
    update public.project_slugs set is_current = true
    where project_id = saved_project_id and slug = candidate_slug;
    if not found then
      insert into public.project_slugs(project_id, slug, is_current)
      values (saved_project_id, candidate_slug, true);
    end if;
  end if;

  delete from public.project_technologies where project_id = saved_project_id;
  insert into public.project_technologies(project_id, technology_id, sort_order)
  select saved_project_id, chosen.id, row_number() over (order by requested.ordinality)::integer
  from unnest(coalesce(p_technology_ids, '{}'::uuid[])) with ordinality as requested(id, ordinality)
  join public.technologies chosen on chosen.id = requested.id
  group by chosen.id, requested.ordinality;

  foreach technology_name in array coalesce(p_new_technology_names, '{}'::text[]) loop
    technology_name := btrim(technology_name);
    if technology_name <> '' then
      insert into public.technologies(name) values (technology_name)
      on conflict (name) do update set name = excluded.name
      returning id into technology_uuid;
      if not exists (select 1 from public.project_technologies where project_id = saved_project_id and technology_id = technology_uuid) then
        insert into public.project_technologies(project_id, technology_id, sort_order)
        values (saved_project_id, technology_uuid, (select count(*)::integer from public.project_technologies where project_id = saved_project_id));
      end if;
    end if;
  end loop;

  return saved_project_id;
end;
$$;

revoke all on function public.save_admin_project(uuid, jsonb, uuid[], text[]) from public, anon;
grant execute on function public.save_admin_project(uuid, jsonb, uuid[], text[]) to authenticated;
