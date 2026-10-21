const CACHE_KEYS = {
  projects: 'portfolio:public-projects:v1',
  about: 'portfolio:public-about:v1',
  contact: 'portfolio:public-contact:v1',
};

function readCache(key) {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function writePublicContentCache(name, value) {
  try {
    localStorage.setItem(CACHE_KEYS[name], JSON.stringify(value));
  } catch {
    // Cache storage is optional; the fetched content still works for this visit.
  }
}

export const getCachedPublicProjects = () => readCache(CACHE_KEYS.projects);
export const getCachedPublicAbout = () => readCache(CACHE_KEYS.about);
export const getCachedPublicContact = () => readCache(CACHE_KEYS.contact);

export function invalidatePublicPortfolioCache() {
  try {
    Object.values(CACHE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('portfolio:public-hero:v1');
    localStorage.removeItem('portfolio:public-content:v6');
  } catch {
    // The cache is optional; the public page will fetch fresh content on reload.
  }
}
