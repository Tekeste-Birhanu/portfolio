import { supabase } from './supabase.js';

export const PROJECT_FIELDS = [
  ['name', 'Project name', true],
  ['short_description', 'Short description', true],
  ['long_description', 'Long description'],
  ['status', 'Status', true],
  ['repository_url', 'Repository URL'],
  ['live_demo_url', 'Live demo URL'],
  ['key_features', 'Key features'],
  ['technical_details', 'Technical details'],
  ['challenges_and_solutions', 'Challenges and solutions'],
  ['what_i_learned', 'What I learned'],
];

export const EMPTY_PROJECT = Object.fromEntries(PROJECT_FIELDS.map(([key]) => [key, '']));

export function validateProject(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter a project name.';
  if (!values.short_description.trim()) errors.short_description = 'Enter a short description.';
  if (!['planning', 'in_progress', 'completed'].includes(values.status)) errors.status = 'Choose a project status.';
  for (const key of ['repository_url', 'live_demo_url']) {
    const value = values[key].trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors[key] = 'Enter a valid http or https URL.';
    }
  }
  return errors;
}

export async function getProjectEditorData(projectId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const [projectResult, technologyResult, selectedResult] = await Promise.all([
    projectId
      ? supabase.from('projects').select(PROJECT_FIELDS.map(([key]) => key).join(',')).eq('id', projectId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('project_technologies').select('technologies!inner(id,name)').order('sort_order'),
    projectId
      ? supabase.from('project_technologies').select('technology_id,sort_order').eq('project_id', projectId).order('sort_order')
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [projectResult, technologyResult, selectedResult]) if (result.error) throw result.error;
  if (projectId && !projectResult.data) throw new Error('This project could not be found. It may have been deleted.');
  const uniqueTechnologies = new Map();
  for (const row of technologyResult.data ?? []) {
    const technology = row.technologies;
    if (technology) uniqueTechnologies.set(technology.id, technology);
  }
  return {
    project: projectResult.data ? { ...EMPTY_PROJECT, ...projectResult.data, repository_url: projectResult.data.repository_url ?? '', live_demo_url: projectResult.data.live_demo_url ?? '', ...Object.fromEntries(PROJECT_FIELDS.filter(([key]) => !['status', 'name', 'short_description', 'repository_url', 'live_demo_url'].includes(key)).map(([key]) => [key, projectResult.data[key] ?? ''])) } : { ...EMPTY_PROJECT },
    technologies: [...uniqueTechnologies.values()].sort((a, b) => a.name.localeCompare(b.name)),
    selectedTechnologyIds: (selectedResult.data ?? []).map((item) => item.technology_id),
  };
}

export async function saveProject(projectId, values, technologyIds, newTechnologyNames) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('save_admin_project', {
    p_project_id: projectId || null,
    p_project: Object.fromEntries(PROJECT_FIELDS.map(([key]) => [key, values[key].trim() || null])),
    p_technology_ids: technologyIds,
    p_new_technology_names: newTechnologyNames,
  });
  if (error) throw error;
  return data;
}

export async function permanentlyDeleteProject(projectId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: media, error: mediaError } = await supabase.from('project_media').select('storage_path').eq('project_id', projectId);
  if (mediaError) throw new Error('Could not check the project files. The project has not been deleted.');
  const paths = [...new Set((media ?? []).map((item) => item.storage_path).filter(Boolean))];
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from('project-media').remove(paths);
    if (storageError) throw new Error('Some project files could not be removed. The project is still saved; retry deletion.');
  }
  const { data, error } = await supabase.from('projects').delete().eq('id', projectId).select('id').maybeSingle();
  if (error || !data) throw new Error('The files were removed, but the project record could not be deleted. Retry deletion to finish.');
}
