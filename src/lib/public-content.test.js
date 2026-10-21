import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock('./supabase.js', () => ({
  isSupabaseConfigured: true,
  supabase: supabaseMock,
}));

import { getPublicProjectBySlug, getPublicProjects } from './public-content.js';

describe('getPublicProjectBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.storage.from.mockReturnValue({
      getPublicUrl: (path) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
    });
  });

  it('loads the requested project and its related details in one query', async () => {
    const project = {
      id: 'project-1',
      name: 'Portfolio',
      short_description: 'A portfolio site',
      status: 'completed',
      repository_url: 'https://github.com/example/portfolio',
      live_demo_url: null,
      project_slugs: [
        { slug: 'old-portfolio', is_current: false },
        { slug: 'portfolio', is_current: true },
      ],
      project_technologies: [{ sort_order: 1, technologies: { name: 'React' } }],
      project_media: [{
        id: 'media-1',
        storage_path: 'project-1/cover.png',
        media_type: 'still_image',
        alt_text: 'Portfolio screenshot',
        sort_order: 1,
        is_main: true,
      }],
    };
    const queries = [];
    supabaseMock.from.mockImplementation((table) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({
          data: { project_id: project.id, projects: project },
          error: null,
        })),
      };
      queries.push({ table, query });
      return query;
    });

    const result = await getPublicProjectBySlug('old-portfolio');

    expect(queries.map(({ table }) => table)).toEqual(['project_slugs']);
    expect(queries[0].query.eq).toHaveBeenCalledWith('slug', 'old-portfolio');
    expect(queries[0].query.select).toHaveBeenCalledWith(expect.stringContaining('projects!inner'));
    expect(result.slug).toBe('portfolio');
    expect(result.technologies).toEqual(['React']);
    expect(result.media[0].url).toBe('https://storage.test/project-1/cover.png');
  });

  it('does not query project details when the slug does not exist', async () => {
    supabaseMock.from.mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    }));

    await expect(getPublicProjectBySlug('missing-project')).resolves.toBeNull();
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).toHaveBeenCalledWith('project_slugs');
  });
});

describe('getPublicProjects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches one card image per project with only the fields the cards render', async () => {
    const query = {
      select: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(async () => ({
        data: [{
          id: 'project-1',
          name: 'Portfolio',
          short_description: 'A portfolio site',
          status: 'completed',
          sort_order: 1,
          project_slugs: [{ slug: 'portfolio', is_current: true }],
          project_technologies: [{ sort_order: 1, technologies: { name: 'React' } }],
          project_media: [{ storage_path: 'project-1/cover.png', alt_text: 'Portfolio screenshot' }],
        }],
        error: null,
      })),
    };
    supabaseMock.from.mockReturnValue(query);
    supabaseMock.storage.from.mockReturnValue({
      getPublicUrl: (path) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
    });

    await expect(getPublicProjects()).resolves.toMatchObject([{
      id: 'project-1',
      image: { alt_text: 'Portfolio screenshot', url: 'https://storage.test/project-1/cover.png' },
    }]);
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('project_media(storage_path, alt_text)'));
    expect(query.order).toHaveBeenCalledWith('is_main', { ascending: false, referencedTable: 'project_media' });
    expect(query.limit).toHaveBeenCalledWith(1, { referencedTable: 'project_media' });
  });
});
