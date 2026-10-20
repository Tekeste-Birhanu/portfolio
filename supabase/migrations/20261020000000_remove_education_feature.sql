drop policy if exists "Public can read education entries" on public.education_entries;
drop policy if exists "Designated administrator can manage education entries" on public.education_entries;

revoke all on table public.education_entries from anon, authenticated;
