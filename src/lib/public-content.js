import { isSupabaseConfigured, supabase } from './supabase.js';

const PUBLIC_CONTENT_CACHE_KEY = 'portfolio:public-content:v2';

export function getCachedPublicPortfolio() {
  try {
    const cached = sessionStorage.getItem(PUBLIC_CONTENT_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
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

function mapProject(row) {
  const media = sortByOrder(row.project_media ?? []);
  const mainMedia = media.find((item) => item.is_main) ?? media[0] ?? null;
  const technologyLinks = sortByOrder(row.project_technologies ?? []);
  const currentSlug = row.project_slugs?.find((item) => item.is_current)?.slug;

  return {
    id: row.id,
    name: row.name,
    slug: currentSlug,
    historicalSlugs: (row.project_slugs ?? []).filter((item) => !item.is_current).map((item) => item.slug),
    shortDescription: row.short_description,
    longDescription: row.long_description,
    keyFeatures: row.key_features,
    technicalDetails: row.technical_details,
    challengesAndSolutions: row.challenges_and_solutions,
    whatILearned: row.what_i_learned,
    status: row.status,
    isFeatured: row.is_featured,
    repositoryUrl: safeHttpUrl(row.repository_url),
    liveDemoUrl: safeHttpUrl(row.live_demo_url),
    technologies: technologyLinks.map((item) => item.technologies?.name).filter(Boolean),
    media: (mainMedia ? [mainMedia, ...media.filter((item) => item.id !== mainMedia.id)] : media)
      .map((item) => ({
        ...item,
        url: supabase.storage.from('project-media').getPublicUrl(item.storage_path).data.publicUrl,
      })),
    image: mainMedia ? {
      ...mainMedia,
      url: supabase.storage.from('project-media').getPublicUrl(mainMedia.storage_path).data.publicUrl,
    } : null,
  };
}

export async function getPublicPortfolio() {
  if (!isSupabaseConfigured || !supabase) {
    const error = new Error('Add the public Supabase URL and anon key to .env.local, then restart the dev server.');
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }

  const [homepageResult, categoriesResult, projectsResult] = await Promise.all([
    supabase.from('homepage_content').select('intro_text').eq('id', true).maybeSingle(),
    supabase
      .from('skill_categories')
      .select('id, name, sort_order, skills(id, name, sort_order)')
      .order('sort_order', { ascending: true }),
    supabase
      .from('projects')
      .select(`
        id, name, short_description, long_description, key_features, technical_details,
        challenges_and_solutions, what_i_learned, status, is_featured, repository_url,
        live_demo_url, sort_order,
        project_slugs(slug, is_current),
        project_technologies(sort_order, technologies(name)),
        project_media(id, storage_path, media_type, alt_text, sort_order, is_main)
      `)
      .order('sort_order', { ascending: true }),
  ]);

  const homepage = unwrap(homepageResult);
  const categories = unwrap(categoriesResult);
  const projectRows = unwrap(projectsResult);

  const portfolio = {
    intro: homepage?.intro_text?.trim() ?? '',
    skillCategories: sortByOrder(categories)
      .map((category) => ({
        id: category.id,
        name: category.name,
        skills: sortByOrder(category.skills ?? []),
      }))
      .filter((category) => category.skills.length > 0),
    projects: sortByOrder(projectRows).map(mapProject),
  };

  try {
    sessionStorage.setItem(PUBLIC_CONTENT_CACHE_KEY, JSON.stringify(portfolio));
  } catch {
    // Storage may be unavailable or full; the freshly loaded data still works.
  }

  return portfolio;
}
