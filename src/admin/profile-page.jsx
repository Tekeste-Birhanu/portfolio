import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminLayout } from './projects-page.jsx';
import {
  addSkillCategory,
  deleteProfileEntry,
  deleteSkill,
  deleteSkillCategory,
  getProfileEditorData,
  profileCvUrl,
  removeProfileFile,
  reorderProfileEntries,
  reorderSkillCategories,
  reorderSkills,
  renameSkillCategory,
  retryProfileMediaCleanup,
  saveProfileEntry,
  saveProfileFile,
  saveProfileIntro,
  saveSkill,
  validateProfileFile,
} from '../lib/profile-admin.js';

const ENTRY_FIELDS = {
  education: [
    { name: 'institution', label: 'Institution', required: true },
    { name: 'qualification_or_course', label: 'Qualification or course', required: true },
    { name: 'date_range', label: 'Date range' },
    { name: 'description', label: 'Description', multiline: true },
  ],
  experience: [
    { name: 'organization', label: 'Organization', required: true },
    { name: 'role', label: 'Role', required: true },
    { name: 'date_range', label: 'Date range' },
    { name: 'description', label: 'Description', multiline: true },
  ],
};

function emptyEntry(kind) {
  return Object.fromEntries(ENTRY_FIELDS[kind].map(({ name }) => [name, '']));
}

function ProfileEntrySection({ kind, title, items, busy, run }) {
  const snapshot = JSON.stringify(items);
  const lastSnapshot = useRef(snapshot);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(items.map((item) => [item.id, { ...item }])));
  const [newEntry, setNewEntry] = useState(() => emptyEntry(kind));
  const [orderedIds, setOrderedIds] = useState(() => items.map((item) => item.id));
  const [draggedId, setDraggedId] = useState(null);
  const [orderNotice, setOrderNotice] = useState('');
  useEffect(() => {
    if (snapshot === lastSnapshot.current) return;
    lastSnapshot.current = snapshot;
    setDrafts(Object.fromEntries(items.map((item) => [item.id, { ...item }])));
    setOrderedIds(items.map((item) => item.id));
  }, [items, snapshot]);

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    void run(() => reorderProfileEntries(kind, next.map((item) => item.id)), `${title} order saved.`);
  };
  const orderedItems = kind === 'experience'
    ? [...orderedIds.map((id) => items.find((item) => item.id === id)).filter(Boolean), ...items.filter((item) => !orderedIds.includes(item.id))]
    : items;
  const orderChanged = kind === 'experience' && orderedItems.some((item, index) => item.id !== items[index]?.id);
  const hasExperienceChanges = kind === 'experience' && (orderChanged || items.some((item) => ENTRY_FIELDS.experience.some(({ name }) => String(drafts[item.id]?.[name] ?? item[name] ?? '').trim() !== String(item[name] ?? '').trim())));
  const reorderExperience = (targetId) => {
    if (!draggedId || draggedId === targetId || busy) return;
    const next = orderedItems.map((item) => item.id);
    const sourceIndex = next.indexOf(draggedId);
    const targetIndex = next.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedIds(next);
  };
  const saveExperience = () => {
    if (!hasExperienceChanges) return;
    void run(async () => {
      for (const item of items) {
        const draft = drafts[item.id] ?? item;
        if (ENTRY_FIELDS.experience.some(({ name }) => String(draft[name] ?? '').trim() !== String(item[name] ?? '').trim())) {
          await saveProfileEntry('experience', { ...draft, id: item.id });
        }
      }
      if (orderChanged) await reorderProfileEntries('experience', orderedItems.map((item) => item.id));
    }, 'Experience saved.');
  };

  const add = async (event) => {
    event.preventDefault();
    const saved = await run(() => saveProfileEntry(kind, newEntry), `${title} entry added.`);
    if (saved) setNewEntry(emptyEntry(kind));
  };
  const addEntryForm = <form className="admin-profile-add-entry" onSubmit={add}>
    <h3>Add {title.toLocaleLowerCase()} entry</h3>
    <div className="admin-profile-entry-fields">
      {ENTRY_FIELDS[kind].map((field) => <label className={field.multiline ? 'is-wide' : ''} key={field.name}>
        <span>{field.label}{field.required && <span aria-hidden="true"> *</span>}</span>
        {field.multiline
          ? <textarea rows="3" value={newEntry[field.name]} required={field.required} onChange={(event) => setNewEntry((current) => ({ ...current, [field.name]: event.target.value }))} />
          : <input value={newEntry[field.name]} required={field.required} onChange={(event) => setNewEntry((current) => ({ ...current, [field.name]: event.target.value }))} />}
      </label>)}
    </div>
    <button className="button button-secondary" type="submit" disabled={busy}>Add entry</button>
  </form>;

  return <section className="admin-profile-section" aria-labelledby={`profile-${kind}-title`}>
    <h2 id={`profile-${kind}-title`}>{title}</h2>
    {kind === 'experience' && <p className="visually-hidden" role="status" aria-live="polite">{orderNotice}</p>}
    {items.length === 0 && <p className="empty-state">No {title.toLocaleLowerCase()} entries yet.</p>}
    <ol className={`admin-profile-entry-list admin-profile-entry-list-${kind}`}>
      {orderedItems.map((item, index) => {
        const draft = drafts[item.id] ?? item;
        return <li className={`admin-profile-entry${draggedId === item.id ? ' is-dragging' : ''}`} key={item.id}
          onDragOver={kind === 'experience' ? (event) => event.preventDefault() : undefined}
          onDrop={kind === 'experience' ? (event) => { event.preventDefault(); reorderExperience(item.id); setDraggedId(null); } : undefined}
        >
          <div className="admin-profile-entry-fields">
            {ENTRY_FIELDS[kind].map((field) => <label className={field.multiline ? 'is-wide' : ''} key={field.name}>
              <span>{field.label}{field.required && <span aria-hidden="true"> *</span>}</span>
              {field.multiline
                ? <textarea rows="3" value={draft[field.name] ?? ''} required={field.required} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, [field.name]: event.target.value } }))} />
                : <input value={draft[field.name] ?? ''} required={field.required} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, [field.name]: event.target.value } }))} />}
            </label>)}
          </div>
          <div className="admin-profile-actions">
            {kind === 'experience' ? <button className="admin-profile-drag-handle" type="button" draggable={!busy} aria-label={`Reorder ${draft.role || 'experience entry'}, position ${index + 1} of ${orderedItems.length}. Use the up or down arrow key to move.`} aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder, or use arrow keys" onDragStart={(event) => { setDraggedId(item.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => setDraggedId(null)} onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              const targetIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
              if (targetIndex < 0 || targetIndex >= orderedItems.length) return;
              const next = orderedItems.map((entry) => entry.id);
              [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
              setOrderedIds(next);
              setOrderNotice(`Draft order changed: ${draft.role || 'Experience entry'} is at position ${targetIndex + 1} of ${orderedItems.length}. Save experience to apply it.`);
            }}>⠿</button> : <>
              <button className="button button-secondary" type="button" disabled={busy || index === 0} onClick={() => move(index, -1)}>Move earlier</button>
              <button className="button button-secondary" type="button" disabled={busy || index === items.length - 1} onClick={() => move(index, 1)}>Move later</button>
              <button className="button button-secondary" type="button" disabled={busy} onClick={() => void run(() => saveProfileEntry(kind, { ...draft, id: item.id }), `${title} entry saved.`)}>Save entry</button>
            </>}
            <button className="button button-danger" type="button" disabled={busy} onClick={() => {
              if (window.confirm(`Remove this ${title.toLocaleLowerCase()} entry?`)) void run(() => deleteProfileEntry(kind, item.id), `${title} entry removed.`);
            }}>Remove</button>
          </div>
        </li>;
      })}
      <li className="admin-profile-entry-add-card">{addEntryForm}</li>
    </ol>
    {kind === 'experience' && <button className="button button-secondary" type="button" disabled={busy || !hasExperienceChanges} onClick={saveExperience}>Save experience</button>}
  </section>;
}

export function AdminProfilePage() {
  const [data, setData] = useState(null);
  const [intro, setIntro] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [cvError, setCvError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [skillDrafts, setSkillDrafts] = useState({});
  const [newSkillNames, setNewSkillNames] = useState({});
  const [pendingSkills, setPendingSkills] = useState({});
  const [draggedCategoryId, setDraggedCategoryId] = useState(null);
  const [draggedSkill, setDraggedSkill] = useState(null);
  const initializedDrafts = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await getProfileEditorData();
      setData(loaded);
      if (!initializedDrafts.current) {
        setIntro(loaded.profile.intro ?? '');
        setCategoryDrafts(Object.fromEntries(loaded.categories.map((category) => [category.id, category.name])));
        setSkillDrafts(Object.fromEntries(loaded.categories.flatMap((category) => category.skills.map((skill) => [skill.id, { name: skill.name }]))));
        initializedDrafts.current = true;
      }
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Profile data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const run = async (action, successMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      await load();
      setNotice(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      return result ?? true;
    } catch (actionError) {
      await load();
      setError(actionError.message || 'The change could not be saved.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveCv = async () => {
    if (!cvFile) return;
    const result = await run(() => saveProfileFile('cv_storage_path', cvFile), (saved) => saved.cleanupPending ? 'CV saved. Old-file cleanup is queued for retry.' : 'CV saved.');
    if (result) { setCvFile(null); document.getElementById('profile-cv-file').value = ''; }
  };

  if (loading && !data) return <AdminLayout title="Profile" activeSection="profile"><p role="status">Loading profile…</p></AdminLayout>;
  if (!data) return <AdminLayout title="Profile" activeSection="profile"><div className="admin-error-panel" role="alert"><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Retry</button></div></AdminLayout>;

  const categories = data.categories;
  const addCategory = async (event) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    const result = await run(() => addSkillCategory(name, categories.length + 1), 'Skill category added.');
    if (result) setCategoryName('');
  };
  const hasSkillChanges = categories.some((category) => {
    const categoryNameDraft = (categoryDrafts[category.id] ?? category.name).trim();
    return categoryNameDraft !== category.name
      || category.skills.some((skill) => (skillDrafts[skill.id]?.name ?? skill.name).trim() !== skill.name)
      || (pendingSkills[category.id] ?? []).length > 0;
  });
  const saveSkills = async () => {
    if (!hasSkillChanges) return;
    if (categories.some((category) => !(categoryDrafts[category.id] ?? category.name).trim() || category.skills.some((skill) => !(skillDrafts[skill.id]?.name ?? skill.name).trim()) || (pendingSkills[category.id] ?? []).some((skill) => !skill.name.trim()))) {
      setError('Category names and skills cannot be empty.');
      setNotice('');
      return;
    }
    const categoryChanges = categories
      .map((category) => ({ ...category, name: (categoryDrafts[category.id] ?? category.name).trim() }))
      .filter((category) => category.name !== categories.find((item) => item.id === category.id)?.name);
    const skillChanges = categories.flatMap((category) => category.skills
      .map((skill) => ({ ...skill, name: (skillDrafts[skill.id]?.name ?? skill.name).trim() }))
      .filter((skill) => skill.name !== category.skills.find((item) => item.id === skill.id)?.name)
      .map((skill) => ({ ...skill, category_id: category.id, original_category_id: category.id })));
    const result = await run(async () => {
      for (const category of categoryChanges) await renameSkillCategory(category.id, category.name);
      for (const skill of skillChanges) await saveSkill(skill);
      for (const category of categories) {
        for (const skill of pendingSkills[category.id] ?? []) {
          await saveSkill({ category_id: category.id, name: skill.name });
          setPendingSkills((current) => ({ ...current, [category.id]: (current[category.id] ?? []).filter((item) => item.id !== skill.id) }));
        }
      }
    }, 'Skills saved.');
    if (result) {
      setCategoryDrafts((current) => Object.fromEntries(categories.map((category) => [category.id, (current[category.id] ?? category.name).trim()])));
      setSkillDrafts((current) => Object.fromEntries(categories.flatMap((category) => category.skills.map((skill) => [skill.id, { name: (current[skill.id]?.name ?? skill.name).trim() }]))));
    }
  };
  const reorderCategories = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId || busy) return;
    const index = categories.findIndex((category) => category.id === sourceId);
    const target = categories.findIndex((category) => category.id === targetId);
    if (index < 0 || target < 0) return;
    const next = [...categories];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    void run(() => reorderSkillCategories(next.map((category) => category.id)), 'Category order saved.');
  };
  const reorderSkillItems = (categoryId, sourceId, targetId) => {
    if (!sourceId || sourceId === targetId || busy) return;
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    const pending = pendingSkills[categoryId] ?? [];
    if (pending.some((skill) => skill.id === sourceId) || pending.some((skill) => skill.id === targetId)) {
      if (!pending.some((skill) => skill.id === sourceId) || !pending.some((skill) => skill.id === targetId)) return;
      const index = pending.findIndex((skill) => skill.id === sourceId);
      const target = pending.findIndex((skill) => skill.id === targetId);
      const next = [...pending];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      setPendingSkills((current) => ({ ...current, [categoryId]: next }));
      return;
    }
    const index = category.skills.findIndex((skill) => skill.id === sourceId);
    const target = category.skills.findIndex((skill) => skill.id === targetId);
    if (index < 0 || target < 0) return;
    const next = [...category.skills];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    void run(() => reorderSkills(categoryId, next.map((skill) => skill.id)), 'Skill order saved.');
  };
  const moveCategoryByKey = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    reorderCategories(categories[index].id, categories[target].id);
  };
  const moveSkillByKey = (category, displaySkills, index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= displaySkills.length) return;
    reorderSkillItems(category.id, displaySkills[index].id, displaySkills[target].id);
  };
  const moveSkillToCategory = (skillId, sourceCategoryId, targetCategoryId) => {
    if (!skillId || !sourceCategoryId || !targetCategoryId || sourceCategoryId === targetCategoryId || busy) return;
    const pending = pendingSkills[sourceCategoryId] ?? [];
    const pendingSkill = pending.find((item) => item.id === skillId);
    if (pendingSkill) {
      setPendingSkills((current) => ({
        ...current,
        [sourceCategoryId]: (current[sourceCategoryId] ?? []).filter((item) => item.id !== skillId),
        [targetCategoryId]: [...(current[targetCategoryId] ?? []), pendingSkill],
      }));
      return;
    }
    const source = categories.find((category) => category.id === sourceCategoryId);
    const skill = source?.skills.find((item) => item.id === skillId);
    if (!skill) return;
    void run(() => saveSkill({ id: skill.id, name: skill.name, category_id: targetCategoryId, original_category_id: sourceCategoryId }), 'Skill moved.');
  };

  return <AdminLayout title="Profile" activeSection="profile">
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="auth-success" role="status">{notice}</p>}
    {loading && <p role="status">Refreshing profile…</p>}
    <div className="admin-profile-page">
      <div className="admin-profile-top-grid">
      <section className="admin-profile-section" aria-labelledby="profile-intro-title">
        <h2 id="profile-intro-title">About introduction</h2>
        <label className="admin-profile-wide-field" htmlFor="profile-intro">Introduction</label>
        <textarea id="profile-intro" rows="5" value={intro} onChange={(event) => setIntro(event.target.value)} />
        <button className="button admin-primary-button" type="button" disabled={busy || intro === (data.profile.intro ?? '')} onClick={() => { void run(() => saveProfileIntro(intro), 'Introduction saved.').then((result) => { if (result) setIntro(intro.trim()); }); }}>Save introduction</button>
      </section>

      <section className="admin-profile-section" aria-labelledby="profile-files-title">
        <h2 id="profile-files-title">CV</h2>
        <div className="admin-profile-files">
          <div className="admin-profile-file-card admin-profile-cv-card">
            <h3>CV</h3>
            {data.profile.cv_storage_path && <p><a href={profileCvUrl(data.profile.cv_storage_path)}>Download current CV</a></p>}
            <label htmlFor="profile-cv-file">PDF, up to 10 MB</label>
            <input id="profile-cv-file" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => { const file = event.target.files?.[0] ?? null; setCvFile(file); setCvError(file ? validateProfileFile('cv_storage_path', file) : ''); }} />
            {cvFile && <p className="admin-list-help">Selected: {cvFile.name}</p>}
            {cvError && <p className="admin-field-error" role="alert">{cvError}</p>}
            <div className="admin-profile-actions">
              <button className="button button-secondary" type="button" disabled={busy || !cvFile || Boolean(cvError)} onClick={() => void saveCv()}>Save CV</button>
              {data.profile.cv_storage_path && <button className="button button-danger" type="button" disabled={busy} onClick={() => { if (window.confirm('Remove the CV?')) void run(() => removeProfileFile('cv_storage_path'), 'CV removed.'); }}>Remove CV</button>}
            </div>
          </div>
        </div>
      </section>
      </div>

      <ProfileEntrySection kind="education" title="Education" items={data.education} busy={busy} run={run} />
      <ProfileEntrySection kind="experience" title="Experience" items={data.experience} busy={busy} run={run} />

      <section className="admin-profile-section" aria-labelledby="profile-skills-title">
        <h2 id="profile-skills-title">Skills</h2>
        {categories.length === 0 && <p className="empty-state">No skill categories yet.</p>}
        <ol className="admin-profile-categories">
          {categories.map((category, categoryIndex) => <li className={`admin-profile-category${draggedCategoryId === category.id ? ' is-dragging' : ''}`} key={category.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); if (draggedSkill) moveSkillToCategory(draggedSkill.id, draggedSkill.categoryId, category.id); else reorderCategories(draggedCategoryId, category.id); setDraggedCategoryId(null); setDraggedSkill(null); }}
          >
            {(() => {
              const displaySkills = [
                ...category.skills.map((skill) => ({ ...skill, isPending: false })),
                ...(pendingSkills[category.id] ?? []).map((skill) => ({ ...skill, isPending: true })),
              ];
              return <>
            <div className="admin-profile-category-heading">
              <button className="admin-profile-drag-handle" type="button" draggable={!busy} aria-label={`Reorder ${category.name}, position ${categoryIndex + 1} of ${categories.length}. Use the up or down arrow key to move.`} aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder, or use arrow keys" onDragStart={(event) => { setDraggedCategoryId(category.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', category.id); }} onDragEnd={() => setDraggedCategoryId(null)} onKeyDown={(event) => { if (event.key === 'ArrowUp') { event.preventDefault(); moveCategoryByKey(categoryIndex, -1); } else if (event.key === 'ArrowDown') { event.preventDefault(); moveCategoryByKey(categoryIndex, 1); } }}>⠿</button>
              <label>Category name<input value={categoryDrafts[category.id] ?? category.name} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: event.target.value }))} /></label>
              <div className="admin-profile-actions">
                <button className="button button-danger" type="button" disabled={busy || displaySkills.length > 0} onClick={() => { if (window.confirm(`Remove the empty category “${category.name}”?`)) void run(() => deleteSkillCategory(category.id), 'Category removed.'); }}>Remove category</button>
              </div>
            </div>
            {displaySkills.length === 0 && <p className="admin-list-help">No skills in this category yet.</p>}
            <ol className="admin-profile-skill-list">
              {displaySkills.map((skill, skillIndex) => {
                const draft = skillDrafts[skill.id] ?? { name: skill.name };
                return <li className={`${draggedSkill?.id === skill.id ? 'is-dragging' : ''}${skill.isPending ? ' is-pending' : ''}`} key={skill.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggedSkill?.categoryId === category.id) reorderSkillItems(category.id, draggedSkill.id, skill.id); else if (draggedSkill) moveSkillToCategory(draggedSkill.id, draggedSkill.categoryId, category.id); setDraggedSkill(null); }}
                >
                  <button className="admin-profile-drag-handle" type="button" draggable={!busy} aria-label={`Reorder ${skill.name}, position ${skillIndex + 1} of ${displaySkills.length}. Use the up or down arrow key to move.`} aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder, or use arrow keys" onDragStart={(event) => { setDraggedSkill({ categoryId: category.id, id: skill.id }); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', skill.id); }} onDragEnd={() => setDraggedSkill(null)} onKeyDown={(event) => { if (event.key === 'ArrowUp') { event.preventDefault(); moveSkillByKey(category, displaySkills, skillIndex, -1); } else if (event.key === 'ArrowDown') { event.preventDefault(); moveSkillByKey(category, displaySkills, skillIndex, 1); } }}>⠿</button>
                  <label><span className="visually-hidden">Skill name</span><input value={skill.isPending ? skill.name : draft.name} onChange={(event) => {
                    if (skill.isPending) setPendingSkills((current) => ({ ...current, [category.id]: (current[category.id] ?? []).map((item) => item.id === skill.id ? { ...item, name: event.target.value } : item) }));
                    else setSkillDrafts((current) => ({ ...current, [skill.id]: { ...draft, name: event.target.value } }));
                  }} /></label>
                  <div className="admin-profile-actions">
                    <button className="button button-danger" type="button" disabled={busy} onClick={() => {
                      if (skill.isPending) setPendingSkills((current) => ({ ...current, [category.id]: (current[category.id] ?? []).filter((item) => item.id !== skill.id) }));
                      else if (window.confirm(`Remove the skill “${skill.name}”?`)) void run(() => deleteSkill(skill.id), 'Skill removed.');
                    }}>Remove</button>
                  </div>
                </li>;
              })}
            </ol>
            <form className="admin-profile-add-skill" onSubmit={(event) => {
              event.preventDefault();
              const name = (newSkillNames[category.id] ?? '').trim();
              if (!name) return;
              setPendingSkills((current) => ({ ...current, [category.id]: [...(current[category.id] ?? []), { id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`, name }] }));
              setNewSkillNames((current) => ({ ...current, [category.id]: '' }));
            }}>
              <label htmlFor={`new-skill-${category.id}`}>Add skill</label>
              <div><input id={`new-skill-${category.id}`} value={newSkillNames[category.id] ?? ''} onChange={(event) => setNewSkillNames((current) => ({ ...current, [category.id]: event.target.value }))} required /><button className="button button-secondary" type="submit" disabled={busy || !(newSkillNames[category.id] ?? '').trim()}>Add skill</button></div>
            </form>
              </>;
            })()}
          </li>)}
          <li className="admin-profile-category admin-profile-category-add">
            <form className="admin-profile-add-category" onSubmit={addCategory}>
              <label htmlFor="new-skill-category">Add a category</label>
              <div><input id="new-skill-category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required /><button className="button button-secondary" type="submit" disabled={busy || !categoryName.trim()}>Add category</button></div>
            </form>
          </li>
        </ol>
        <button className="button button-secondary admin-profile-save-skills" type="button" disabled={busy || !hasSkillChanges} onClick={() => void saveSkills()}>Save skills</button>
      </section>

      {data.cleanups.some((item) => item.bucket_id === 'profile-cv') && <section className="admin-profile-section" aria-labelledby="profile-cleanup-title">
        <h2 id="profile-cleanup-title">File cleanup needs retry</h2>
        <ul className="admin-profile-cleanups">{data.cleanups.filter((item) => item.bucket_id === 'profile-cv').map((item) => <li key={item.id}><span>CV: <code>{item.storage_path}</code></span><button className="button button-secondary" type="button" disabled={busy} onClick={() => void run(() => retryProfileMediaCleanup(item), 'File cleanup completed.')}>Retry cleanup</button></li>)}</ul>
      </section>}
    </div>
  </AdminLayout>;
}
