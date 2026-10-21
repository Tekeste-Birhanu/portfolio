import { isSupabaseConfigured, supabase } from './supabase.js';
import { writePublicContentCache } from './public-content-cache.js';

const PROJECT_DETAIL_FIELDS = `
  id, name, short_description, long_description, key_features, technical_details,
  challenges_and_solutions, what_i_learned, status, repository_url, live_demo_url,
  sort_order, project_slugs(slug, is_current),
  project_technologies(sort_order, technologies(name)),
  project_media(id, storage_path, media_type, alt_text, sort_order, is_main)
`;

const PROJECT_LIST_FIELDS = `
  id, name, short_description, status, repository_url, live_demo_url,
  project_slugs(slug, is_current),
  project_technologies(sort_order, technologies(name)),
  project_media(storage_path, alt_text)
`;
const inFlightRequests = new Map();

function dedupeRequest(key, request) {
  const pending = inFlightRequests.get(key);
  if (pending) return pending;
  const promise = request().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
}

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    const error = new Error('Add the public Supabase URL and anon key to .env.local, then restart the dev server.');
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }
}

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

function sortByOrder(items = []) {
  return [...items].sort((left, right) => left.sort_order - right.sort_order);
}

function safeHttpUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function publicMedia(item) {
  return {
    ...item,
    url: supabase.storage.from('project-media').getPublicUrl(item.storage_path).data.publicUrl,
  };
}

function mapProjectDetails(row) {
  const media = sortByOrder(row.project_media ?? []);
  const mainMedia = media.find((item) => item.is_main) ?? media[0] ?? null;
  const technologyLinks = sortByOrder(row.project_technologies ?? []);
  const currentSlug = row.project_slugs?.find((item) => item.is_current)?.slug;

  return {
    id: row.id,
    name: row.name,
    slug: currentSlug,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    keyFeatures: row.key_features,
    technicalDetails: row.technical_details,
    challengesAndSolutions: row.challenges_and_solutions,
    whatILearned: row.what_i_learned,
    status: row.status,
    repositoryUrl: safeHttpUrl(row.repository_url),
    liveDemoUrl: safeHttpUrl(row.live_demo_url),
    technologies: technologyLinks.map((item) => item.technologies?.name).filter(Boolean),
    media: media.map(publicMedia),
    image: mainMedia ? publicMedia(mainMedia) : null,
  };
}

function mapProjectCard(row) {
  const mainMedia = row.project_media?.[0] ?? null;
  const currentSlug = row.project_slugs?.find((item) => item.is_current)?.slug;
  return {
    id: row.id,
    name: row.name,
    slug: currentSlug,
    shortDescription: row.short_description,
    status: row.status,
    repositoryUrl: safeHttpUrl(row.repository_url),
    liveDemoUrl: safeHttpUrl(row.live_demo_url),
    technologies: sortByOrder(row.project_technologies ?? [])
      .map((item) => item.technologies?.name)
      .filter(Boolean),
    image: mainMedia ? publicMedia(mainMedia) : null,
  };
}

export async function getPublicProjects() {
  return dedupeRequest('projects', async () => {
    assertSupabaseConfigured();
    let query = supabase
      .from('projects')
      .select(PROJECT_LIST_FIELDS)
      .order('sort_order', { ascending: true });
    query = query
      .order('is_main', { ascending: false, referencedTable: 'project_media' })
      .order('sort_order', { ascending: true, referencedTable: 'project_media' })
      .limit(1, { referencedTable: 'project_media' });
    const rows = unwrap(await query);
    const projects = (rows ?? []).map(mapProjectCard);
    writePublicContentCache('projects', projects);
    return projects;
  });
}

export async function getPublicAbout() {
  return dedupeRequest('about', async () => {
    assertSupabaseConfigured();
    const [profileResult, experienceResult, categoriesResult] = await Promise.all([
      supabase.from('profile_content').select('intro, cv_storage_path').eq('id', true).maybeSingle(),
      supabase.from('experience_entries').select('id, organization, role, date_range, description, sort_order').order('sort_order', { ascending: true }),
      supabase.from('skill_categories').select('id, name, sort_order, skills(id, name, sort_order)').order('sort_order', { ascending: true }),
    ]);
    const profile = unwrap(profileResult);
    const experience = unwrap(experienceResult);
    const categories = unwrap(categoriesResult);
    const about = {
      profile: {
        intro: profile?.intro?.trim() ?? '',
        cvUrl: profile?.cv_storage_path
          ? supabase.storage.from('profile-cv').getPublicUrl(profile.cv_storage_path).data.publicUrl
          : null,
      },
      experience: sortByOrder(experience ?? []),
      skillCategories: sortByOrder(categories ?? [])
        .map((category) => ({
          id: category.id,
          name: category.name,
          skills: sortByOrder(category.skills ?? []),
        }))
        .filter((category) => category.skills.length > 0),
    };
    writePublicContentCache('about', about);
    return about;
  });
}

function mapContactMethods(rows) {
  return sortByOrder(rows ?? []).map((method) => {
    if (method.method_type === 'email') {
      const address = method.value?.trim() ?? '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
        ? { id: method.id, label: method.label, value: address, href: `mailto:${address}`, icon: 'email' }
        : null;
    }
    if (method.icon_key === 'phone') {
      const phone = method.value?.trim() ?? '';
      const digitCount = phone.replace(/\D/g, '').length;
      return /^\+?[0-9][0-9 ()-]{5,24}$/.test(phone) && digitCount >= 7 && digitCount <= 15
        ? { id: method.id, label: method.label, value: phone, href: `tel:${phone.replace(/[^+\d]/g, '')}`, icon: 'phone' }
        : null;
    }
    const href = safeHttpUrl(method.value);
    if (!href) return null;
    return { id: method.id, label: method.label, value: method.value.trim(), href, icon: method.icon_key ?? 'website' };
  }).filter(Boolean);
}

export async function getPublicContact() {
  return dedupeRequest('contact', async () => {
    assertSupabaseConfigured();
    const rows = unwrap(await supabase.from('contact_methods')
      .select('id, label, method_type, icon_key, value, sort_order')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true }));
    const contact = mapContactMethods(rows);
    writePublicContentCache('contact', contact);
    return contact;
  });
}

export async function getPublicProjectBySlug(slug) {
  assertSupabaseConfigured();
  const result = unwrap(await supabase
    .from('project_slugs')
    .select(`project_id, projects!inner(${PROJECT_DETAIL_FIELDS})`)
    .eq('slug', slug)
    .maybeSingle());
  const project = Array.isArray(result?.projects) ? result.projects[0] : result?.projects;
  return project ? mapProjectDetails(project) : null;
}
