import { describe, expect, it } from 'vitest';
import {
  renameSkillCategory,
  saveProfileEntry,
  saveSkill,
  validateProfileFile,
} from './profile-admin.js';

describe('profile media validation', () => {
  it('accepts PDFs up to 10 MB and rejects empty files', () => {
    expect(validateProfileFile('cv_storage_path', { type: 'application/pdf', size: 10 * 1024 * 1024 })).toBe('');
    expect(validateProfileFile('cv_storage_path', { type: 'application/pdf', size: 0 })).toMatch(/file is empty/);
  });
});

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
