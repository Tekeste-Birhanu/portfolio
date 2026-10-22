import { describe, expect, it } from 'vitest';
import {
  renameSkillCategory,
  saveProfileEntry,
  saveSkill,
} from './profile-admin.js';

describe('profile content validation', () => {
  it('rejects experience entries missing required fields', async () => {
    await expect(saveProfileEntry('education', { institution: '', qualification_or_course: 'Course' }))
      .rejects.toThrow('Unknown profile entry type.');
    await expect(saveProfileEntry('experience', { organization: 'Org', role: ' ' }))
      .rejects.toThrow('Complete the required fields before saving.');
  });

  it('rejects blank category names and skill names', async () => {
    await expect(renameSkillCategory('category-id', '  ')).rejects.toThrow('Category name is required.');
    await expect(saveSkill({ category_id: 'category-id', name: '  ' })).rejects.toThrow('Skill name is required.');
  });
});
