import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getProjectMediaData,
  removeProjectMedia,
  reorderProjectMedia,
  replaceProjectMedia,
  retryProjectMediaCleanup,
  saveProjectMediaAltText,
  setProjectMediaMain,
  uploadProjectMedia,
  validateProjectMediaFile,
} from '../lib/project-media-admin.js';
import { invalidatePublicPortfolioCache } from '../lib/public-content.js';

function fileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ProjectMediaManager({ projectId, onPendingChange, onRegisterPendingUpload }) {
  const [media, setMedia] = useState([]);
  const [cleanups, setCleanups] = useState([]);
  const [altDrafts, setAltDrafts] = useState({});
  const [newAltText, setNewAltText] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [makeNewMain, setMakeNewMain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const uploadingRef = useRef(false);
  const [newFilePreview, setNewFilePreview] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjectMediaData(projectId);
      setMedia(data.media);
      setCleanups(data.cleanups);
      setAltDrafts(Object.fromEntries(data.media.map((item) => [item.id, item.alt_text])));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Project media could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    onRegisterPendingUpload?.(saveMediaChanges);
    return () => onRegisterPendingUpload?.(null);
  });
  useEffect(() => {
    if (!newFile) {
      setNewFilePreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(newFile);
    setNewFilePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [newFile]);
  const perform = async (action, successMessage) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await action();
      invalidatePublicPortfolioCache();
      await reload();
      setMessage(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      return result;
    } catch (actionError) {
      await reload();
      setError(actionError.message || 'The media change could not be saved.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleNewFile = (event) => {
    const file = event.target.files?.[0] ?? null;
    setNewFile(file);
    onPendingChange?.(Boolean(file), Boolean(file && newAltText.trim()));
    setError(file ? validateProjectMediaFile(file) : '');
    setMessage('');
  };

  const clearSelection = () => {
    setNewFile(null);
    onPendingChange?.(false, false);
    setNewAltText('');
    setError('');
    const input = document.getElementById(`project-media-upload-${projectId}`);
    if (input) input.value = '';
  };

  const upload = async (file = newFile, altText = newAltText) => {
    if (!file || uploadingRef.current) return;
    const validationError = validateProjectMediaFile(file);
    if (validationError) { setError(validationError); return; }
    if (!altText.trim()) { setError('Add alt text describing the image before uploading.'); return; }
    uploadingRef.current = true;
    const result = await perform(
      () => uploadProjectMedia(projectId, file, altText, makeNewMain),
      (item) => item.mainError ? `Image uploaded, but setting it as the main image failed. ${item.mainError}` : 'Image uploaded and saved.',
    );
    if (result) {
      setNewFile(null);
      onPendingChange?.(false, false);
      setNewAltText('');
      setMakeNewMain(false);
      const input = document.getElementById(`project-media-upload-${projectId}`);
      if (input) input.value = '';
    }
    uploadingRef.current = false;
  };

  const saveMediaChanges = async () => {
    const changedAltTexts = media.filter((item) => (altDrafts[item.id] ?? '') !== item.alt_text);
    if (changedAltTexts.some((item) => !(altDrafts[item.id] ?? '').trim())) {
      setError('Alt text cannot be empty. Fill it in before saving.');
      return false;
    }

    if (newFile) {
      const uploaded = await upload(newFile, newAltText);
      if (!uploaded) return false;
    }

    if (!changedAltTexts.length) return true;

    const result = await perform(async () => {
      await Promise.all(changedAltTexts.map((item) => saveProjectMediaAltText(item.id, altDrafts[item.id])));
      return true;
    }, '');
    return Boolean(result);
  };

  const changeOrder = (index, direction) => {
    const next = [...media];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void perform(() => reorderProjectMedia(projectId, next.map((item) => item.id)), 'Image order saved.');
  };

  const handleReplace = (item, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const validationError = validateProjectMediaFile(file);
    if (validationError) { setError(validationError); return; }
    void perform(
      () => replaceProjectMedia(item, file),
      (result) => result.cleanupPending ? 'Replacement saved. The old file could not be removed yet; retry cleanup below.' : 'Image replaced.',
    );
  };

  const handleRemove = (item) => {
    if (!window.confirm(`Remove this image from ${item.is_main ? 'the project (it is currently the main image)' : 'the project'}?`)) return;
    void perform(() => removeProjectMedia(item), 'Image removed.');
  };

  return <fieldset className="admin-project-media">
    <legend>Project images and GIFs</legend>
    <p className="admin-list-help">Upload JPG, PNG, or WebP files up to 5 MB, or GIF files up to 10 MB. Each image needs alt text. Uploads and alt text changes save with Save project; image actions save immediately.</p>
    {error && <div className="admin-error-panel" role="alert"><p>{error}</p>{!error.includes('waiting for a database migration') && !busy && !loading && <button className="button button-secondary" type="button" onClick={() => void reload()}>Reload media</button>}</div>}
      {message && <p className="auth-success" role="status">{message}</p>}
    {loading ? <p role="status">Loading project media…</p> : media.length === 0 ? <p className="empty-state">No images or GIFs have been added.</p> : <ol className="admin-media-list" aria-label="Project media order">
      {media.map((item, index) => <li className="admin-media-item" key={item.id}>
        <img className="admin-media-preview" src={item.url} alt="" />
        <div className="admin-media-details">
          <p className="admin-media-meta">{item.media_type === 'gif' ? 'GIF' : 'Still image'} · {fileSize(Number(item.size_bytes))}{item.is_main ? ' · Main image' : ''}</p>
          <label htmlFor={`media-alt-${item.id}`}>Alt text</label>
          <input id={`media-alt-${item.id}`} value={altDrafts[item.id] ?? ''} onChange={(event) => setAltDrafts((current) => ({ ...current, [item.id]: event.target.value }))} aria-required="true" />
          <div className="admin-media-actions">
            <button className="button button-secondary" type="button" disabled={busy || index === 0} onClick={() => changeOrder(index, -1)} aria-label={`Move image ${index + 1} earlier`}>Move earlier</button>
            <button className="button button-secondary" type="button" disabled={busy || index === media.length - 1} onClick={() => changeOrder(index, 1)} aria-label={`Move image ${index + 1} later`}>Move later</button>
            {!item.is_main && <button className="button button-secondary" type="button" disabled={busy} onClick={() => void perform(() => setProjectMediaMain(item.id), 'Main image changed.')}>Set as main</button>}
            <label className="button button-secondary admin-media-replace">Replace
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => handleReplace(item, event)} aria-label={`Replace image ${index + 1}`} />
            </label>
            <button className="button button-danger" type="button" disabled={busy} onClick={() => handleRemove(item)}>Remove</button>
          </div>
        </div>
      </li>)}
    </ol>}
    <div className="admin-media-upload">
      <h3>Upload an image</h3>
      {media.length > 0 && <label className="admin-media-main-choice"><input type="checkbox" checked={makeNewMain} onChange={(event) => setMakeNewMain(event.target.checked)} disabled={busy} /> Set as the main image</label>}
      <label htmlFor={`project-media-upload-${projectId}`}>Image file</label>
      <input id={`project-media-upload-${projectId}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleNewFile} disabled={busy} />
      {newFile && <p className="admin-media-meta">{newFile.name} · {fileSize(newFile.size)}</p>}
      {newFile && newFilePreview && <figure className="admin-media-selected-preview"><img src={newFilePreview} alt="" /><figcaption>Selected image preview</figcaption></figure>}
      {newFile && <button className="button button-secondary" type="button" disabled={busy} onClick={clearSelection}>Clear selected image</button>}
      <label htmlFor={`project-media-alt-new-${projectId}`}>Alt text <span aria-hidden="true">*</span></label>
      <input id={`project-media-alt-new-${projectId}`} value={newAltText} onChange={(event) => { setNewAltText(event.target.value); onPendingChange?.(Boolean(newFile), Boolean(newFile && event.target.value.trim())); }} disabled={busy} required aria-required="true" placeholder="Describe what the image shows" />
      {busy && <p role="status" aria-live="polite">Saving media…</p>}
    </div>
    {cleanups.length > 0 && <section className="admin-media-cleanup" aria-labelledby={`media-cleanup-title-${projectId}`}>
      <h3 id={`media-cleanup-title-${projectId}`}>Storage cleanup needs retry</h3>
      <p>These files are no longer used by the project. Retry removes them from Storage.</p>
      <ul>{cleanups.map((cleanup) => <li key={cleanup.id}><code>{cleanup.storage_path}</code><button className="button button-secondary" type="button" disabled={busy} onClick={() => void perform(() => retryProjectMediaCleanup(cleanup), 'Storage cleanup completed.')}>Retry cleanup</button></li>)}</ul>
    </section>}
  </fieldset>;
}
