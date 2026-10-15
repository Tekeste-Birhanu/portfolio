create extension if not exists pgcrypto;

create table public.homepage_content (
  id boolean primary key default true check (id),
  intro_text text not null,
  updated_at timestamptz not null default now()
);

create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.skill_categories(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skills_category_order_idx on public.skills(category_id, sort_order);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_description text not null,
  long_description text,
  status text not null check (status in ('in_progress', 'completed')),
  is_featured boolean not null default false,
  repository_url text,
  live_demo_url text,
  key_features text,
  technical_details text,
  challenges_and_solutions text,
  what_i_learned text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_order_idx on public.projects(sort_order);
create index projects_featured_order_idx on public.projects(is_featured, sort_order);

create table public.project_slugs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index project_slugs_one_current_idx on public.project_slugs(project_id) where is_current;
create index project_slugs_project_idx on public.project_slugs(project_id);

create table public.technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.project_technologies (
  project_id uuid not null references public.projects(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (project_id, technology_id)
);

create index project_technologies_order_idx on public.project_technologies(project_id, sort_order);

create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('still_image', 'gif')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  size_bytes bigint not null check (size_bytes > 0),
  alt_text text not null,
  sort_order integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (media_type = 'gif' and mime_type = 'image/gif' and size_bytes <= 10485760)
    or (media_type = 'still_image' and mime_type in ('image/jpeg', 'image/png', 'image/webp') and size_bytes <= 5242880)
  )
);

create index project_media_order_idx on public.project_media(project_id, sort_order);
create unique index project_media_one_main_idx on public.project_media(project_id) where is_main;

alter table public.homepage_content enable row level security;
alter table public.skill_categories enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;
alter table public.project_slugs enable row level security;
alter table public.technologies enable row level security;
alter table public.project_technologies enable row level security;
alter table public.project_media enable row level security;

create policy "Public can read homepage content" on public.homepage_content
  for select to anon, authenticated using (true);
create policy "Public can read skill categories" on public.skill_categories
  for select to anon, authenticated using (true);
create policy "Public can read skills" on public.skills
  for select to anon, authenticated using (true);
create policy "Public can read projects" on public.projects
  for select to anon, authenticated using (true);
create policy "Public can read project slugs" on public.project_slugs
  for select to anon, authenticated using (true);
create policy "Public can read technologies" on public.technologies
  for select to anon, authenticated using (true);
create policy "Public can read project technologies" on public.project_technologies
  for select to anon, authenticated using (true);
create policy "Public can read project media" on public.project_media
  for select to anon, authenticated using (true);

grant select on public.homepage_content to anon, authenticated;
grant select on public.skill_categories to anon, authenticated;
grant select on public.skills to anon, authenticated;
grant select on public.projects to anon, authenticated;
grant select on public.project_slugs to anon, authenticated;
grant select on public.technologies to anon, authenticated;
grant select on public.project_technologies to anon, authenticated;
grant select on public.project_media to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media',
  'project-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Public can read project media files" on storage.objects
  for select to anon, authenticated using (bucket_id = 'project-media');
