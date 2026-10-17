create table public.contact_methods (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(btrim(label)) > 0),
  method_type text not null check (method_type in ('email', 'link')),
  value text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (method_type = 'email' and (value = '' or value ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    or (method_type = 'link' and value ~* '^https?://[^[:space:]]+$')
  ),
  check (method_type <> 'email' or is_enabled)
);

create unique index contact_methods_single_email_idx
  on public.contact_methods ((method_type))
  where method_type = 'email';
create index contact_methods_enabled_order_idx
  on public.contact_methods (is_enabled, sort_order);

insert into public.contact_methods (label, method_type, value, is_enabled, sort_order)
values ('Email', 'email', '', true, 0)
on conflict do nothing;

create function public.protect_required_email_contact_method()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.method_type = 'email' then
      raise exception 'The required Email contact method cannot be removed.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.method_type = 'email'
    and (new.id <> old.id or new.method_type <> 'email' or not new.is_enabled) then
    raise exception 'The required Email contact method cannot be disabled or changed to another type.';
  end if;

  if tg_op = 'INSERT' and new.method_type = 'email'
    and exists (select 1 from public.contact_methods where method_type = 'email') then
    raise exception 'The required Email contact method already exists.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_required_email_contact_method_trigger
  before insert or update or delete on public.contact_methods
  for each row execute function public.protect_required_email_contact_method();

create table public.visitor_messages (
  id uuid primary key default gen_random_uuid(),
  visitor_email text not null check (length(visitor_email) between 1 and 254),
  message_body text not null check (length(message_body) between 1 and 5000),
  created_at timestamptz not null default now(),
  is_read boolean not null default false,
  notification_status text not null default 'pending'
    check (notification_status in ('pending', 'sent', 'failed')),
  notification_attempted_at timestamptz,
  check (visitor_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  check (length(btrim(message_body)) > 0)
);

create index visitor_messages_created_at_idx on public.visitor_messages (created_at desc);

alter table public.contact_methods enable row level security;
alter table public.visitor_messages enable row level security;

create policy "Public can read enabled contact methods" on public.contact_methods
  for select to anon, authenticated using (is_enabled);
create policy "Designated administrator can manage contact methods" on public.contact_methods
  for all to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can read visitor messages" on public.visitor_messages
  for select to authenticated using (public.is_designated_admin());
create policy "Designated administrator can update visitor message read state" on public.visitor_messages
  for update to authenticated
  using (public.is_designated_admin())
  with check (public.is_designated_admin());
create policy "Designated administrator can delete visitor messages" on public.visitor_messages
  for delete to authenticated using (public.is_designated_admin());

grant select on public.contact_methods to anon, authenticated;
grant select on public.contact_methods to service_role;
revoke insert, update, delete on public.contact_methods from anon, authenticated;
grant select, update, delete on public.visitor_messages to authenticated;
revoke insert on public.visitor_messages from anon, authenticated;
grant insert, update on public.visitor_messages to service_role;

create function public.save_admin_contact_methods(p_methods jsonb)
returns setof public.contact_methods
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_id uuid;
  v_type text;
  v_email_id uuid;
  v_keep_ids uuid[] := array[]::uuid[];
  v_email_count integer;
begin
  if not public.is_designated_admin() then
    raise exception 'Only the designated administrator can save contact methods.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_methods) <> 'array' then
    raise exception 'Contact methods must be supplied as a list.' using errcode = '22023';
  end if;

  select count(*) into v_email_count
  from jsonb_array_elements(p_methods) as item(value)
  where item.value ->> 'method_type' = 'email';
  if v_email_count <> 1 then
    raise exception 'Exactly one Email contact method is required.' using errcode = '22023';
  end if;

  select id into v_email_id from public.contact_methods where method_type = 'email';

  for v_item in
    select item.value, item.ordinality
    from jsonb_array_elements(p_methods) with ordinality as item(value, ordinality)
  loop
    v_id := nullif(v_item.value ->> 'id', '')::uuid;
    v_type := v_item.value ->> 'method_type';
    if v_id is null or v_type not in ('email', 'link') then
      raise exception 'A contact method is missing its ID or has an unsupported type.' using errcode = '22023';
    end if;
    if v_type = 'email' and v_id <> v_email_id then
      raise exception 'The required Email contact method cannot be replaced.' using errcode = '22023';
    end if;

    if exists (select 1 from public.contact_methods where id = v_id) then
      update public.contact_methods
      set label = v_item.value ->> 'label',
          method_type = v_type,
          value = v_item.value ->> 'value',
          is_enabled = coalesce((v_item.value ->> 'is_enabled')::boolean, true),
          sort_order = (v_item.ordinality - 1)::integer
      where id = v_id;
    else
      if v_type = 'email' then
        raise exception 'The required Email contact method cannot be replaced.' using errcode = '22023';
      end if;
      insert into public.contact_methods (id, label, method_type, value, is_enabled, sort_order)
      values (
        v_id,
        v_item.value ->> 'label',
        v_type,
        v_item.value ->> 'value',
        coalesce((v_item.value ->> 'is_enabled')::boolean, true),
        (v_item.ordinality - 1)::integer
      );
    end if;
    v_keep_ids := array_append(v_keep_ids, v_id);
  end loop;

  delete from public.contact_methods
  where method_type = 'link' and not (id = any(v_keep_ids));

  return query
  select * from public.contact_methods order by sort_order, created_at;
end;
$$;

revoke all on function public.save_admin_contact_methods(jsonb) from public, anon;
grant execute on function public.save_admin_contact_methods(jsonb) to authenticated;
