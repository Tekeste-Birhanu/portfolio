drop index if exists public.projects_featured_order_idx;

alter table public.projects
  drop column if exists is_featured;
