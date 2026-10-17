alter table public.contact_methods
  add column icon_key text not null default 'website';

update public.contact_methods
set icon_key = case
  when method_type = 'email' then 'email'
  when lower(value) like '%github.com/%' or lower(value) = 'https://github.com' then 'github'
  when lower(value) like '%linkedin.com/%' or lower(value) = 'https://linkedin.com' then 'linkedin'
  when lower(value) like '%youtube.com/%' or lower(value) like '%youtu.be/%' then 'youtube'
  when lower(value) like '%instagram.com/%' then 'instagram'
  when lower(value) like '%telegram.me/%' or lower(value) like '%t.me/%' then 'telegram'
  when lower(value) like '%x.com/%' or lower(value) like '%twitter.com/%' then 'x'
  when lower(value) like '%facebook.com/%' then 'facebook'
  when lower(value) like '%whatsapp.com/%' or lower(value) like '%wa.me/%' then 'whatsapp'
  when lower(value) like '%discord.com/%' or lower(value) like '%discord.gg/%' then 'discord'
  else 'website'
end;

alter table public.contact_methods
  add constraint contact_methods_icon_key_check check (
    (method_type = 'email' and icon_key = 'email')
    or (method_type = 'link' and icon_key in (
      'website', 'github', 'linkedin', 'youtube', 'telegram', 'instagram',
      'x', 'facebook', 'whatsapp', 'discord', 'phone'
    ))
  );

alter table public.contact_methods
  drop constraint contact_methods_check;

alter table public.contact_methods
  add constraint contact_methods_value_valid_check check (
    (method_type = 'email' and (value = '' or value ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    or (
      method_type = 'link'
      and (
        (
          icon_key = 'phone'
          and value ~ '^\+?[0-9][0-9 ()-]{5,24}$'
          and length(regexp_replace(value, '[^0-9]', '', 'g')) between 7 and 15
        )
        or (icon_key <> 'phone' and value ~* '^https?://[^[:space:]]+$')
      )
    )
  );

create or replace function public.save_admin_contact_methods(p_methods jsonb)
returns setof public.contact_methods
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_id uuid;
  v_type text;
  v_icon_key text;
  v_value text;
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
    v_icon_key := v_item.value ->> 'icon_key';
    v_value := btrim(coalesce(v_item.value ->> 'value', ''));
    if v_id is null or v_type is null or v_type not in ('email', 'link') then
      raise exception 'A contact method is missing its ID or has an unsupported type.' using errcode = '22023';
    end if;
    if v_type = 'email' and (v_id <> v_email_id or v_icon_key is distinct from 'email') then
      raise exception 'The required Email contact method cannot be replaced or given another icon.' using errcode = '22023';
    end if;
    if v_type = 'link' and (v_icon_key is null or v_icon_key not in (
      'website', 'github', 'linkedin', 'youtube', 'telegram', 'instagram',
      'x', 'facebook', 'whatsapp', 'discord', 'phone'
    )) then
      raise exception 'Choose a supported contact method icon.' using errcode = '22023';
    end if;
    if v_type = 'link' and v_icon_key = 'phone' then
      if v_value !~ '^\+?[0-9][0-9 ()-]{5,24}$'
        or length(regexp_replace(v_value, '[^0-9]', '', 'g')) not between 7 and 15 then
        raise exception 'Enter a phone number with 7 to 15 digits.' using errcode = '22023';
      end if;
    elsif v_type = 'link' and v_value !~* '^https?://[^[:space:]]+$' then
      raise exception 'Enter a valid HTTP or HTTPS contact link.' using errcode = '22023';
    end if;

    if exists (select 1 from public.contact_methods where id = v_id) then
      update public.contact_methods
      set label = btrim(v_item.value ->> 'label'),
          method_type = v_type,
          icon_key = v_icon_key,
          value = v_value,
          is_enabled = coalesce((v_item.value ->> 'is_enabled')::boolean, true),
          sort_order = (v_item.ordinality - 1)::integer
      where id = v_id;
    else
      if v_type = 'email' then
        raise exception 'The required Email contact method cannot be replaced.' using errcode = '22023';
      end if;
      insert into public.contact_methods (id, label, method_type, icon_key, value, is_enabled, sort_order)
      values (
        v_id,
        btrim(v_item.value ->> 'label'),
        v_type,
        v_icon_key,
        v_value,
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
