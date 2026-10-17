import { supabase } from './supabase.js';
import { invalidatePublicPortfolioCache } from './public-content.js';

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function getHomepageEditorData() {
  const db = client();
  const [homepageResult, profileResult, cleanupResult] = await Promise.all([
    db.from('homepage_content').select('intro_text, role_text, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href').eq('id', true).maybeSingle(),
    db.from('profile_content').select('photo_storage_path').eq('id', true).maybeSingle(),
    db.from('profile_media_cleanup').select('id, bucket_id, storage_path, created_at').eq('bucket_id', 'profile-photo').order('created_at', { ascending: true }),
  ]);
  if (homepageResult.error) throw homepageResult.error;
  if (profileResult.error) throw profileResult.error;
  if (cleanupResult.error) throw cleanupResult.error;
  return {
    introText: homepageResult.data?.intro_text ?? '',
    roleText: homepageResult.data?.role_text ?? 'Software Developer',
    primaryCtaLabel: homepageResult.data?.primary_cta_label ?? 'Get in touch',
    primaryCtaHref: homepageResult.data?.primary_cta_href ?? '#contact',
    secondaryCtaLabel: homepageResult.data?.secondary_cta_label ?? 'View my GitHub',
    secondaryCtaHref: homepageResult.data?.secondary_cta_href ?? '',
    photoStoragePath: profileResult.data?.photo_storage_path ?? null,
    cleanups: cleanupResult.data ?? [],
  };
}

function validateCtaHref(value, { allowContactAnchor = false } = {}) {
  const href = String(value ?? '').trim();
  if (allowContactAnchor && href === '#contact') return href;
  try {
    const url = new URL(href);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {
    // Invalid URLs are rejected below.
  }
  throw new Error('Enter a valid http or https link.');
}

export async function saveHomepageContent({ introText, roleText, primaryCtaLabel, primaryCtaHref, secondaryCtaLabel, secondaryCtaHref }) {
  const normalized = String(introText ?? '').trim();
  if (!normalized) throw new Error('Enter a homepage introduction before saving.');
  const normalizedRole = String(roleText ?? '').trim();
  const primaryLabel = String(primaryCtaLabel ?? '').trim();
  const secondaryLabel = String(secondaryCtaLabel ?? '').trim();
  if (!normalizedRole) throw new Error('Enter a role beneath your name.');
  if (!primaryLabel) throw new Error('Enter a label for the contact button.');
  if (!secondaryLabel) throw new Error('Enter a label for the GitHub button.');
  const primaryHref = validateCtaHref(primaryCtaHref, { allowContactAnchor: true });
  const secondaryHref = String(secondaryCtaHref ?? '').trim()
    ? validateCtaHref(secondaryCtaHref)
    : null;

  const { error } = await client()
    .from('homepage_content')
    .upsert({
      id: true,
      intro_text: normalized,
      role_text: normalizedRole,
      primary_cta_label: primaryLabel,
      primary_cta_href: primaryHref,
      secondary_cta_label: secondaryLabel,
      secondary_cta_href: secondaryHref,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw error;
  invalidatePublicPortfolioCache();
  return { introText: normalized, roleText: normalizedRole, primaryCtaLabel: primaryLabel, primaryCtaHref: primaryHref, secondaryCtaLabel: secondaryLabel, secondaryCtaHref: secondaryHref ?? '' };
}
