create table public.profile_content (
  id boolean primary key default true check (id),
  intro text,
  photo_storage_path text,
  cv_storage_path text,
  updated_at timestamptz not null default now()
);

insert into public.profile_content (id) values (true)
on conflict (id) do nothing;

create table public.education_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id boolean not null default true references public.profile_content(id) on delete cascade,
  institution text not null check (length(trim(institution)) > 0),
  qualification_or_course text not null check (length(trim(qualification_or_course)) > 0),
  date_range text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index education_entries_order_idx on public.education_entries(profile_id, sort_order);

create table public.experience_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id boolean not null default true references public.profile_content(id) on delete cascade,
  organization text not null check (length(trim(organization)) > 0),
  role text not null check (length(trim(role)) > 0),
  date_range text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index experience_entries_order_idx on public.experience_entries(profile_id, sort_order);

alter table public.profile_content enable row level security;
alter table public.education_entries enable row level security;
alter table public.experience_entries enable row level security;

create policy "Public can read profile content" on public.profile_content
  for select to anon, authenticated using (true);
create policy "Public can read education entries" on public.education_entries
  for select to anon, authenticated using (true);
create policy "Public can read experience entries" on public.experience_entries
  for select to anon, authenticated using (true);

grant select on public.profile_content to anon, authenticated;
grant select on public.education_entries to anon, authenticated;
grant select on public.experience_entries to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-photo', 'profile-photo', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-cv', 'profile-cv', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "Public can read profile photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'profile-photo');
create policy "Public can read profile CVs" on storage.objects
  for select to anon, authenticated using (bucket_id = 'profile-cv');
