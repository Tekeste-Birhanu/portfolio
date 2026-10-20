import { supabase } from './supabase.js';
import { invalidatePublicPortfolioCache } from './public-content.js';

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function getHomepageEditorData() {
  const db = client();
  const [homepageResult, profileResult, cleanupResult] = await Promise.all([
    db.from('homepage_content').select('intro_text, role_text').eq('id', true).maybeSingle(),
    db.from('profile_content').select('photo_storage_path').eq('id', true).maybeSingle(),
    db.from('profile_media_cleanup').select('id, bucket_id, storage_path, created_at').eq('bucket_id', 'profile-photo').order('created_at', { ascending: true }),
  ]);
  if (homepageResult.error) throw homepageResult.error;
  if (profileResult.error) throw profileResult.error;
  if (cleanupResult.error) throw cleanupResult.error;
  return {
    introText: homepageResult.data?.intro_text ?? '',
    roleText: homepageResult.data?.role_text ?? 'Software Developer',
    photoStoragePath: profileResult.data?.photo_storage_path ?? null,
    cleanups: cleanupResult.data ?? [],
  };
}

export async function saveHomepageContent({ introText, roleText }) {
  const normalized = String(introText ?? '').trim();
  if (!normalized) throw new Error('Enter a homepage introduction before saving.');
  const normalizedRole = String(roleText ?? '').trim();
  if (!normalizedRole) throw new Error('Enter a role beneath your name.');

  const { error } = await client()
    .from('homepage_content')
    .upsert({
      id: true,
      intro_text: normalized,
      role_text: normalizedRole,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw error;
  invalidatePublicPortfolioCache();
  return { introText: normalized, roleText: normalizedRole };
}
