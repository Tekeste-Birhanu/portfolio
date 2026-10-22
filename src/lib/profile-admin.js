import { supabase } from './supabase.js';
import { invalidatePublicPortfolioCache } from './public-content-cache.js';

const EXPERIENCE_COLUMNS = 'id, organization, role, date_range, description, sort_order';

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

function ordered(items = []) {
  return [...items].sort((left, right) => left.sort_order - right.sort_order);
}

export async function getProfileEditorData() {
  const db = client();
  const [profileResult, experienceResult, categoryResult] = await Promise.all([
    db.from('profile_content').select('intro').eq('id', true).single(),
    db.from('experience_entries').select(EXPERIENCE_COLUMNS).order('sort_order', { ascending: true }),
    db.from('skill_categories').select('id, name, sort_order, skills(id, name, sort_order)').order('sort_order', { ascending: true }),
  ]);
  return {
    profile: unwrap(profileResult),
    experience: ordered(unwrap(experienceResult)),
    categories: ordered(unwrap(categoryResult)).map((category) => ({ ...category, skills: ordered(category.skills) })),
  };
}

export async function saveProfileIntro(intro) {
  unwrap(await client().from('profile_content').update({ intro: intro.trim() || null, updated_at: new Date().toISOString() }).eq('id', true));
  invalidatePublicPortfolioCache();
}

function entryConfig(kind) {
  if (kind === 'experience') return { table: 'experience_entries', columns: EXPERIENCE_COLUMNS, fields: ['organization', 'role', 'date_range', 'description'] };
  throw new Error('Unknown profile entry type.');
}

export async function saveProfileEntry(kind, entry) {
  const config = entryConfig(kind);
  const values = Object.fromEntries(config.fields.map((field) => [field, String(entry[field] ?? '').trim() || null]));
  for (const required of config.fields.slice(0, 2)) {
    if (!values[required]) throw new Error('Complete the required fields before saving.');
  }
  const db = client();
  if (entry.id) unwrap(await db.from(config.table).update({ ...values, updated_at: new Date().toISOString() }).eq('id', entry.id));
  else {
    const { count, error } = await db.from(config.table).select('id', { count: 'exact', head: true });
    if (error) throw error;
    unwrap(await db.from(config.table).insert({ ...values, sort_order: (count ?? 0) + 1 }));
  }
  invalidatePublicPortfolioCache();
}

export async function deleteProfileEntry(kind, id) {
  const { table } = entryConfig(kind);
  unwrap(await client().from(table).delete().eq('id', id));
  invalidatePublicPortfolioCache();
}

export async function reorderProfileEntries(kind, ids) {
  const { table } = entryConfig(kind);
  const db = client();
  const results = await Promise.all(ids.map((id, index) => db.from(table).update({ sort_order: index + 1 }).eq('id', id)));
  const failure = results.find((result) => result.error);
  if (failure) throw failure.error;
  invalidatePublicPortfolioCache();
}

export async function addSkillCategory(name, sortOrder) {
  unwrap(await client().from('skill_categories').insert({ name: name.trim(), sort_order: sortOrder }));
  invalidatePublicPortfolioCache();
}

export async function renameSkillCategory(id, name) {
  if (!name.trim()) throw new Error('Category name is required.');
  unwrap(await client().from('skill_categories').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', id));
  invalidatePublicPortfolioCache();
}

export async function reorderSkillCategories(ids) {
  const db = client();
  const results = await Promise.all(ids.map((id, index) => db.from('skill_categories').update({ sort_order: index + 1 }).eq('id', id)));
  const failure = results.find((result) => result.error);
  if (failure) throw failure.error;
  invalidatePublicPortfolioCache();
}

export async function deleteSkillCategory(id) {
  unwrap(await client().from('skill_categories').delete().eq('id', id));
  invalidatePublicPortfolioCache();
}

export async function saveSkill(skill) {
  const name = skill.name.trim();
  if (!name) throw new Error('Skill name is required.');
  const db = client();
  if (skill.id) {
    const changes = { name, category_id: skill.category_id, updated_at: new Date().toISOString() };
    if (skill.original_category_id !== skill.category_id) {
      const { count, error } = await db.from('skills').select('id', { count: 'exact', head: true }).eq('category_id', skill.category_id);
      if (error) throw error;
      changes.sort_order = (count ?? 0) + 1;
    }
    unwrap(await db.from('skills').update(changes).eq('id', skill.id));
  } else {
    const { count, error } = await db.from('skills').select('id', { count: 'exact', head: true }).eq('category_id', skill.category_id);
    if (error) throw error;
    unwrap(await db.from('skills').insert({ category_id: skill.category_id, name, sort_order: (count ?? 0) + 1 }));
  }
  invalidatePublicPortfolioCache();
}

export async function reorderSkills(categoryId, ids) {
  const db = client();
  const results = await Promise.all(ids.map((id, index) => db.from('skills').update({ sort_order: index + 1 }).eq('id', id).eq('category_id', categoryId)));
  const failure = results.find((result) => result.error);
  if (failure) throw failure.error;
  invalidatePublicPortfolioCache();
}

export async function deleteSkill(id) {
  unwrap(await client().from('skills').delete().eq('id', id));
  invalidatePublicPortfolioCache();
}
