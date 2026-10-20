import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from './projects-page.jsx';
import { getHomepageEditorData, saveHomepageContent } from '../lib/homepage-admin.js';
import { profilePhotoUrl, removeProfileFile, retryProfileMediaCleanup, saveProfileFile, validateProfileFile } from '../lib/profile-admin.js';

const INTRO_PLACEHOLDER = 'A portfolio introduction has not been added yet.';

export function AdminHomepagePage() {
  const [content, setContent] = useState({ introText: '', roleText: 'Software Developer' });
  const [savedContent, setSavedContent] = useState({ introText: '', roleText: 'Software Developer' });
  const [photoStoragePath, setPhotoStoragePath] = useState(null);
  const [cleanups, setCleanups] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const data = await getHomepageEditorData();
      const loadedContent = {
        introText: data.introText,
        roleText: data.roleText,
      };
      setContent(loadedContent);
      setSavedContent(loadedContent);
      setPhotoStoragePath(data.photoStoragePath);
      setCleanups(data.cleanups);
    } catch (loadError) {
      setLoadFailed(true);
      setError(loadError.message || 'Homepage content could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, attempt]);
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const handleSave = async (event) => {
    event.preventDefault();
    const normalized = {
      introText: content.introText.trim(),
      roleText: content.roleText.trim(),
    };
    if (!normalized.introText) {
      setError('Enter a homepage introduction before saving.');
      setNotice('');
      document.getElementById('homepage-intro')?.focus();
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveHomepageContent(normalized);
      setContent(saved);
      setSavedContent(saved);
      setNotice('Homepage content saved.');
    } catch (saveError) {
      setError(saveError.message || 'The homepage introduction could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhoto = async () => {
    if (!photoFile || photoError) return;
    setSavingPhoto(true);
    setError('');
    setNotice('');
    try {
      const result = await saveProfileFile('photo_storage_path', photoFile);
      setPhotoStoragePath(result.path);
      setPhotoFile(null);
      setPhotoError('');
      document.getElementById('homepage-photo-file').value = '';
      setNotice(result.cleanupPending ? 'Homepage photo saved. Old-file cleanup is queued for retry.' : 'Homepage photo saved.');
    } catch (saveError) {
      setError(saveError.message || 'The homepage photo could not be saved.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoStoragePath || !window.confirm('Remove the homepage photo?')) return;
    setSavingPhoto(true);
    setError('');
    setNotice('');
    try {
      const result = await removeProfileFile('photo_storage_path');
      setPhotoStoragePath(null);
      setNotice(result.cleanupPending ? 'Homepage photo removed. File cleanup is queued for retry.' : 'Homepage photo removed.');
    } catch (removeError) {
      setError(removeError.message || 'The homepage photo could not be removed.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRetryCleanup = async (item) => {
    setSavingPhoto(true);
    setError('');
    setNotice('');
    try {
      await retryProfileMediaCleanup(item);
      setCleanups((current) => current.filter((cleanup) => cleanup.id !== item.id));
      setNotice('Photo cleanup completed.');
    } catch (retryError) {
      setError(retryError.message || 'Photo cleanup could not be completed.');
    } finally {
      setSavingPhoto(false);
    }
  };

  return <AdminLayout title="Homepage" activeSection="homepage">
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="auth-success" role="status">{notice}</p>}
    {loading ? <p role="status">Loading homepage content…</p> : <div className="admin-profile-page admin-homepage-grid">
      <form id="homepage-content-form" className="admin-homepage-form" onSubmit={handleSave}>
        <section className="admin-profile-section" aria-labelledby="homepage-intro-title">
          <h2 id="homepage-intro-title">Hero text</h2>
          <label className="admin-profile-wide-field" htmlFor="homepage-role">Role beneath your name</label>
          <input id="homepage-role" value={content.roleText} onChange={(event) => { setContent((current) => ({ ...current, roleText: event.target.value })); setError(''); setNotice(''); }} required />
          <label className="admin-profile-wide-field" htmlFor="homepage-intro">Short introduction</label>
          <textarea
            id="homepage-intro"
            rows="5"
            value={content.introText}
            onChange={(event) => { setContent((current) => ({ ...current, introText: event.target.value })); setError(''); setNotice(''); }}
            placeholder={INTRO_PLACEHOLDER}
            required
          />
        </section>
        <section className="admin-profile-section" aria-labelledby="homepage-photo-title">
          <h2 id="homepage-photo-title">Homepage photo</h2>
          {(photoPreview || photoStoragePath) && <img className="admin-profile-photo-preview" src={photoPreview || profilePhotoUrl(photoStoragePath)} alt={photoPreview ? 'Selected homepage photo preview' : 'Current homepage photo'} />}
          <label className="admin-profile-wide-field" htmlFor="homepage-photo-file">JPG, PNG, or WebP, up to 5 MB</label>
          <input id="homepage-photo-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={savingPhoto} onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setPhotoFile(file);
            setPhotoError(file ? validateProfileFile('photo_storage_path', file) : '');
            setError('');
            setNotice('');
          }} />
          {photoFile && <p className="admin-list-help">Selected: {photoFile.name}</p>}
          {photoError && <p className="admin-field-error" role="alert">{photoError}</p>}
          <div className="admin-profile-actions">
            <button className="button button-secondary" type="button" disabled={savingPhoto || !photoFile || Boolean(photoError)} onClick={() => void handleSavePhoto()}>{savingPhoto ? 'Saving…' : 'Save photo'}</button>
            {photoStoragePath && <button className="button button-danger" type="button" disabled={savingPhoto} onClick={() => void handleRemovePhoto()}>Remove photo</button>}
          </div>
        </section>
        <button
          className="button admin-primary-button admin-homepage-save"
          type="submit"
          disabled={saving || JSON.stringify(content) === JSON.stringify(savedContent)}
        >
          {saving ? 'Saving…' : 'Save homepage'}
        </button>
      </form>
      {cleanups.length > 0 && <section className="admin-profile-section" aria-labelledby="homepage-photo-cleanup-title">
        <h2 id="homepage-photo-cleanup-title">Photo cleanup needs retry</h2>
        <ul className="admin-profile-cleanups">{cleanups.map((item) => <li key={item.id}><code>{item.storage_path}</code><button className="button button-secondary" type="button" disabled={savingPhoto} onClick={() => void handleRetryCleanup(item)}>Retry cleanup</button></li>)}</ul>
      </section>}
    </div>}
    {!loading && loadFailed && <button className="button button-secondary" type="button" onClick={() => setAttempt((current) => current + 1)}>Retry</button>}
  </AdminLayout>;
}
