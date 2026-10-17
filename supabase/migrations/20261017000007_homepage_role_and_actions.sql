alter table public.homepage_content
  add column role_text text not null default 'Software Developer',
  add column primary_cta_label text not null default 'Get in touch',
  add column primary_cta_href text not null default '#contact',
  add column secondary_cta_label text not null default 'View my GitHub',
  add column secondary_cta_href text;

alter table public.homepage_content
  add constraint homepage_primary_cta_label_not_blank
    check (length(btrim(primary_cta_label)) > 0),
  add constraint homepage_primary_cta_href_valid
    check (primary_cta_href = '#contact' or primary_cta_href ~* '^https?://[^[:space:]]+$'),
  add constraint homepage_secondary_cta_label_not_blank
    check (length(btrim(secondary_cta_label)) > 0),
  add constraint homepage_secondary_cta_href_valid
    check (secondary_cta_href is null or secondary_cta_href ~* '^https?://[^[:space:]]+$');
