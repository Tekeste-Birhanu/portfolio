create table public.admin_config (
  id boolean primary key default true check (id),
  user_id uuid not null unique references auth.users(id) on delete restrict
);

alter table public.admin_config enable row level security;
revoke all on public.admin_config from anon, authenticated;
grant all on public.admin_config to service_role;

create function public.is_designated_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_config
    where id = true and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_designated_admin() from public, anon;
grant execute on function public.is_designated_admin() to authenticated;

create policy "Designated administrator can manage homepage content" on public.homepage_content
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage skill categories" on public.skill_categories
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage skills" on public.skills
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage projects" on public.projects
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage project slugs" on public.project_slugs
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage technologies" on public.technologies
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage project technologies" on public.project_technologies
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage project media" on public.project_media
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage profile content" on public.profile_content
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage education entries" on public.education_entries
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can manage experience entries" on public.experience_entries
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());

grant insert, update, delete on
  public.homepage_content,
  public.skill_categories,
  public.skills,
  public.projects,
  public.project_slugs,
  public.technologies,
  public.project_technologies,
  public.project_media,
  public.profile_content,
  public.education_entries,
  public.experience_entries
to authenticated;

create policy "Designated administrator can upload project media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-media' and public.is_designated_admin());
create policy "Designated administrator can update project media" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-media' and public.is_designated_admin())
  with check (bucket_id = 'project-media' and public.is_designated_admin());
create policy "Designated administrator can delete project media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-media' and public.is_designated_admin());

create policy "Designated administrator can upload profile photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photo' and public.is_designated_admin());
create policy "Designated administrator can update profile photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-photo' and public.is_designated_admin())
  with check (bucket_id = 'profile-photo' and public.is_designated_admin());
create policy "Designated administrator can delete profile photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photo' and public.is_designated_admin());

create policy "Designated administrator can upload profile CVs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-cv' and public.is_designated_admin());
create policy "Designated administrator can update profile CVs" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-cv' and public.is_designated_admin())
  with check (bucket_id = 'profile-cv' and public.is_designated_admin());
create policy "Designated administrator can delete profile CVs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-cv' and public.is_designated_admin());
