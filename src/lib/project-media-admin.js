import { supabase } from './supabase.js';

const MEDIA_LIMITS = {
  'image/jpeg': { mediaType: 'still_image', extension: 'jpg', maxBytes: 5 * 1024 * 1024 },
  'image/png': { mediaType: 'still_image', extension: 'png', maxBytes: 5 * 1024 * 1024 },
  'image/webp': { mediaType: 'still_image', extension: 'webp', maxBytes: 5 * 1024 * 1024 },
  'image/gif': { mediaType: 'gif', extension: 'gif', maxBytes: 10 * 1024 * 1024 },
};

const MEDIA_COLUMNS = 'id, project_id, storage_path, media_type, mime_type, size_bytes, alt_text, sort_order, is_main';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export function validateProjectMediaFile(file) {
  const rule = file && MEDIA_LIMITS[file.type];
  if (!rule) return 'Choose a JPG, PNG, WebP, or GIF image.';
  if (!file.size) return 'The selected file is empty.';
  if (file.size > rule.maxBytes) return `${file.type === 'image/gif' ? 'GIFs' : 'JPG, PNG, and WebP images'} must be ${rule.maxBytes / (1024 * 1024)} MB or smaller.`;
  return '';
}

function mediaRule(file) {
  const error = validateProjectMediaFile(file);
  if (error) throw new Error(error);
  return MEDIA_LIMITS[file.type];
}

function storagePath(projectId, rule) {
  return `${projectId}/${crypto.randomUUID()}.${rule.extension}`;
}

async function removeOrQueueCleanup(projectId, path) {
  const client = requireSupabase();
  const { error: storageError } = await client.storage.from('project-media').remove([path]);
  if (!storageError) return false;
  const { error: queueError } = await client.from('project_media_cleanup').upsert(
    { project_id: projectId, storage_path: path },
    { onConflict: 'storage_path' },
  );
  if (queueError) throw new Error(`Storage cleanup failed for ${path}, and the retry could not be recorded. Remove this file from the project-media bucket manually. ${storageError.message} ${queueError.message}`);
  return true;
}

async function uploadOriginal(projectId, file) {
  const client = requireSupabase();
  const rule = mediaRule(file);
  const path = storagePath(projectId, rule);
  const { error } = await client.storage.from('project-media').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { path, rule };
}

export async function getProjectMediaData(projectId) {
  const client = requireSupabase();
  const [mediaResult, cleanupResult] = await Promise.all([
    client.from('project_media').select(MEDIA_COLUMNS).eq('project_id', projectId).order('sort_order', { ascending: true }),
    client.from('project_media_cleanup').select('id, storage_path, created_at').eq('project_id', projectId).order('created_at', { ascending: true }),
  ]);
  if (mediaResult.error) throw mediaResult.error;
  if (cleanupResult.error) {
    if (cleanupResult.error.code === 'PGRST205' || cleanupResult.error.message?.includes('project_media_cleanup')) {
      throw new Error('Project media setup is waiting for a database migration. Run npm.cmd run db:push from the project folder, then reload this page.');
    }
    throw cleanupResult.error;
  }
  return {
    media: (mediaResult.data ?? []).map((item) => ({
      ...item,
      url: client.storage.from('project-media').getPublicUrl(item.storage_path).data.publicUrl,
    })),
    cleanups: cleanupResult.data ?? [],
  };
}

export async function uploadProjectMedia(projectId, file, altText, makeMain = false) {
  const client = requireSupabase();
  const normalizedAlt = altText.trim();
  if (!normalizedAlt) throw new Error('Add alt text describing the image before uploading.');
  const { path, rule } = await uploadOriginal(projectId, file);
  const { data: existing, error: existingError } = await client.from('project_media').select('id').eq('project_id', projectId).limit(1);
  if (existingError) {
    const cleanupPending = await removeOrQueueCleanup(projectId, path);
    throw new Error(`Could not check the project's media. ${cleanupPending ? 'The uploaded file is queued for cleanup.' : 'The uploaded file was removed.'} ${existingError.message}`);
  }
  const { data, error } = await client.from('project_media').insert({
    project_id: projectId,
    storage_path: path,
    media_type: rule.mediaType,
    mime_type: file.type,
    size_bytes: file.size,
    alt_text: normalizedAlt,
    is_main: false,
  }).select(MEDIA_COLUMNS).single();
  if (error) {
    const cleanupPending = await removeOrQueueCleanup(projectId, path);
    throw new Error(`Could not save the uploaded image metadata. ${cleanupPending ? 'The uploaded file is queued for cleanup.' : 'The uploaded file was removed.'} ${error.message}`);
  }
  if (makeMain || existing.length === 0) {
    const { error: mainError } = await client.rpc('set_admin_project_media_main', { p_media_id: data.id });
    if (mainError) return { ...data, mainError: mainError.message };
  }
  return data;
}

export async function replaceProjectMedia(media, file) {
  const client = requireSupabase();
  const { path, rule } = await uploadOriginal(media.project_id, file);
  const { error } = await client.from('project_media').update({
    storage_path: path,
    media_type: rule.mediaType,
    mime_type: file.type,
    size_bytes: file.size,
  }).eq('id', media.id);
  if (error) {
    const cleanupPending = await removeOrQueueCleanup(media.project_id, path);
    throw new Error(`Could not save the replacement image. ${cleanupPending ? 'The replacement file is queued for cleanup; the original is unchanged.' : 'The replacement file was removed; the original is unchanged.'} ${error.message}`);
  }
  const cleanupPending = await removeOrQueueCleanup(media.project_id, media.storage_path);
  return { cleanupPending };
}

export async function saveProjectMediaAltText(mediaId, altText) {
  const normalizedAlt = altText.trim();
  if (!normalizedAlt) throw new Error('Alt text cannot be empty.');
  const { error } = await requireSupabase().from('project_media').update({ alt_text: normalizedAlt }).eq('id', mediaId);
  if (error) throw error;
}

export async function setProjectMediaMain(mediaId) {
  const { error } = await requireSupabase().rpc('set_admin_project_media_main', { p_media_id: mediaId });
  if (error) throw error;
}

export async function reorderProjectMedia(projectId, mediaIds) {
  const { error } = await requireSupabase().rpc('save_admin_project_media_order', {
    p_project_id: projectId,
    p_media_ids: mediaIds,
  });
  if (error) throw error;
}

export async function removeProjectMedia(media) {
  const client = requireSupabase();
  const { error: storageError } = await client.storage.from('project-media').remove([media.storage_path]);
  if (storageError) throw new Error(`The image file could not be removed. The media entry is unchanged so you can retry. ${storageError.message}`);
  const { error } = await client.from('project_media').delete().eq('id', media.id);
  if (error) throw new Error(`The file was removed, but its media entry could not be deleted. Retry removal to finish. ${error.message}`);
}

export async function retryProjectMediaCleanup(cleanup) {
  const client = requireSupabase();
  const { error: storageError } = await client.storage.from('project-media').remove([cleanup.storage_path]);
  if (storageError) throw new Error(`The file is still in Storage. Retry cleanup. ${storageError.message}`);
  const { error } = await client.from('project_media_cleanup').delete().eq('id', cleanup.id);
  if (error) throw new Error(`The file is gone, but the retry record could not be cleared. Retry cleanup again. ${error.message}`);
}
