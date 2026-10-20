import { describe, expect, it } from 'vitest';
import {
  renameSkillCategory,
  saveProfileEntry,
  saveSkill,
  validateProfileFile,
} from './profile-admin.js';

describe('profile media validation', () => {
  it('accepts supported profile photos up to 5 MB', () => {
    expect(validateProfileFile('photo_storage_path', { type: 'image/webp', size: 5 * 1024 * 1024 })).toBe('');
  });

  it('rejects unsupported and oversized profile photos', () => {
    expect(validateProfileFile('photo_storage_path', { type: 'image/gif', size: 1024 })).toMatch(/JPG, PNG, or WebP/);
    expect(validateProfileFile('photo_storage_path', { type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB or smaller/);
  });

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
