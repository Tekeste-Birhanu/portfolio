import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAdminAuth } from './auth-context.jsx';
import { supabase } from '../lib/supabase.js';
import { EMPTY_PROJECT, PROJECT_FIELDS, getProjectEditorData, permanentlyDeleteProject, saveProject, validateProject } from '../lib/project-admin.js';
import { ProjectMediaManager } from './project-media-manager.jsx';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function formatUpdatedAt(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : dateFormatter.format(date);
}

const adminSections = [
  { label: 'Projects', to: '/admin/projects', id: 'projects' },
  { label: 'Profile', to: '/admin/profile', id: 'profile' },
  { label: 'Homepage', to: '/admin/homepage', id: 'homepage' },
  { label: 'Mailbox', to: '/admin/mailbox', id: 'mailbox' },
];

export function AdminLayout({ title, activeSection = 'projects', children }) {
  const { signOut } = useAdminAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuToggleRef = useRef(null);
  const sidebarPanelRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const focusableItems = () => [...(sidebarPanelRef.current?.querySelectorAll('a[href], button:not([disabled])') ?? [])];
    focusableItems()[0]?.focus();
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableItems();
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0].focus();
      }
    };
    const breakpoint = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = (event) => { if (event.matches) setMenuOpen(false); };
    window.addEventListener('keydown', handleKeydown);
    breakpoint.addEventListener('change', closeOnDesktop);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      breakpoint.removeEventListener('change', closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (menuToggleRef.current?.isConnected) menuToggleRef.current.focus();
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className={`admin-sidebar-header${menuOpen ? ' is-menu-open' : ''}`}>
        <Link className="admin-brand" to="/admin/projects" aria-label="Administrator projects home">
          <span>Administrator</span>
        </Link>
        <button
          className="admin-menu-toggle"
          type="button"
          ref={menuToggleRef}
          aria-expanded={menuOpen}
          aria-controls="admin-navigation-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
      </div>
      {menuOpen && <button className="admin-menu-backdrop" type="button" tabIndex={-1} aria-label="Close administrator navigation" onClick={() => setMenuOpen(false)} />}
      <div
        className={`admin-sidebar-panel${menuOpen ? ' is-open' : ''}`}
        id="admin-navigation-panel"
        ref={sidebarPanelRef}
      >
        <nav className="admin-navigation" aria-label="Administrator navigation">
          {adminSections.map((section) => <Link
            className={`admin-nav-link${activeSection === section.id ? ' is-current' : ''}`}
            to={section.to}
            key={section.id}
            aria-current={activeSection === section.id ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >{section.label}</Link>)}
        </nav>
        <button className="button button-secondary admin-signout" type="button" disabled={signingOut} onClick={handleSignOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
    <section className="admin-content" aria-labelledby="admin-page-title">
      <div className="admin-page-heading">
        <div><h1 id="admin-page-title">{title}</h1></div>
      </div>
      {children}
    </section>
  </div>;
}

export function AdminProjectsPage() {
  const [projects, setProjects] = useState(null);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState('');
  const [orderNotice, setOrderNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const loadProjects = useCallback(async () => {
    if (!supabase) {
      setLoadError(true);
      setProjects([]);
      return;
    }
    setLoadError(false);
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, updated_at, sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      setLoadError(true);
      setProjects([]);
      return;
    }
    setProjects(data ?? []);
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects, attempt]);

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (projects ?? []).filter((project) => project.name.toLocaleLowerCase().includes(query));
  }, [projects, search]);
  const isFiltered = Boolean(search.trim());

  const persistOrder = async (nextProjects, movedProjectId) => {
    if (!supabase) return;
    setBusyId('ordering');
    setActionError('');
    setOrderNotice('');
    setProjects(nextProjects);
    const results = await Promise.all(nextProjects.map((project, index) =>
      supabase.from('projects').update({ sort_order: index + 1 }).eq('id', project.id),
    ));
    if (results.some(({ error }) => error)) {
      setActionError('The new order could not be fully saved. Reloaded the saved order; please try again.');
      setOrderNotice('Project order was not saved.');
      await loadProjects();
    } else {
      setProjects(nextProjects.map((project, index) => ({ ...project, sort_order: index + 1 })));
      const movedIndex = nextProjects.findIndex((project) => project.id === movedProjectId);
      const movedProject = nextProjects[movedIndex];
      setOrderNotice(movedProject ? `${movedProject.name} moved to position ${movedIndex + 1} of ${nextProjects.length}.` : 'Project order saved.');
    }
    setBusyId(null);
  };

  const deleteProject = async (project) => {
    if (!window.confirm(`Permanently delete “${project.name}” and all its stored files? This cannot be undone.`)) return;
    setBusyId(project.id);
    setActionError('');
    try {
      await permanentlyDeleteProject(project.id);
      setProjects((current) => current?.filter((item) => item.id !== project.id) ?? []);
    } catch (deleteError) {
      setActionError(`${deleteError.message} You can retry from this project row.`);
    } finally {
      setBusyId(null);
    }
  };

  const moveProject = (projectId, targetId) => {
    if (!projects || projectId === targetId || busyId) return;
    const from = projects.findIndex((project) => project.id === projectId);
    const to = projects.findIndex((project) => project.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...projects];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next, projectId);
  };

  return <AdminLayout title="Projects">
    <div className="admin-toolbar">
      <div className="admin-search">
        <label htmlFor="project-search">Search projects</label>
        <input id="project-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" />
      </div>
      <Link className="button admin-primary-button admin-add-project" to="/admin/projects/new">Add project</Link>
    </div>
    {actionError && <p className="admin-error" role="alert">{actionError}</p>}
    {projects === null ? <p className="empty-state" role="status">Loading projects…</p> : loadError ? <div className="admin-error-panel" role="alert">
      <p>Projects could not be loaded. Check your connection and try again.</p>
      <button className="button button-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
    </div> : projects.length === 0 ? <p className="empty-state">No projects yet. Add a project to get started.</p> : visibleProjects.length === 0 ? <p className="empty-state">No projects match “{search.trim()}”.</p> : <>
      <p className="admin-list-help" id="project-order-help">{isFiltered ? 'Clear the search to reorder projects.' : 'Drag projects to set the order shown on the public homepage, or focus a handle and press the up or down arrow key.'}</p>
      <ul className="admin-project-list" aria-describedby="project-order-help">
        {visibleProjects.map((project, index) => {
          return <li
          className={`admin-project-row${draggedId === project.id ? ' is-dragging' : ''}`}
          key={project.id}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); if (draggedId) moveProject(draggedId, project.id); setDraggedId(null); }}
        >
          <button
            className="admin-drag-handle"
            type="button"
            draggable={busyId === null && !isFiltered}
            disabled={busyId !== null || isFiltered}
            aria-label={isFiltered ? 'Project order is disabled while search is active. Clear the search to reorder.' : `Reorder ${project.name}, position ${index + 1} of ${visibleProjects.length}. Use the up or down arrow key to move.`}
            aria-keyshortcuts="ArrowUp ArrowDown"
            title={isFiltered ? 'Clear search to reorder' : 'Drag to reorder, or use the arrow keys'}
            onDragStart={(event) => { setDraggedId(project.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', project.id); }}
            onDragEnd={() => setDraggedId(null)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              const targetIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
              if (targetIndex < 0 || targetIndex >= visibleProjects.length) return;
              moveProject(project.id, visibleProjects[targetIndex].id);
            }}
          >⠿</button>
          <div className="admin-project-main">
            <h2>{project.name}</h2>
            <p>Last updated <time dateTime={project.updated_at}>{formatUpdatedAt(project.updated_at)}</time></p>
          </div>
          <div className="admin-row-actions">
            <Link className="button button-secondary admin-edit-link" to={`/admin/projects/${project.id}`}>Edit</Link>
            <button className="button button-danger admin-edit-link" type="button" disabled={busyId !== null} onClick={() => void deleteProject(project)}>{busyId === project.id ? 'Deleting…' : 'Delete'}</button>
          </div>
          </li>;
        })}
      </ul>
      {(busyId === 'ordering' || orderNotice) && <p role="status" aria-live="polite">{busyId === 'ordering' ? 'Saving project order…' : orderNotice}</p>}
    </>}
  </AdminLayout>;
}

function projectState(values, technologyIds, newTechnologyNames) {
  return JSON.stringify([values, technologyIds, newTechnologyNames]);
}

export function AdminProjectEditor({ isNew = false }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ ...EMPTY_PROJECT });
  const [technologies, setTechnologies] = useState([]);
  const [technologyIds, setTechnologyIds] = useState([]);
  const [newTechnologyName, setNewTechnologyName] = useState('');
  const [newTechnologyNames, setNewTechnologyNames] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadState, setLoadState] = useState('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mediaPending, setMediaPending] = useState(false);
  const [mediaAltReady, setMediaAltReady] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const pendingMediaUploadRef = useRef(null);
  const [error, setError] = useState('');
  const initialState = useRef('');
  const currentState = projectState(values, technologyIds, newTechnologyNames);
  const isDirty = loadState === 'ready' && initialState.current !== currentState;
  const blocker = useBlocker(isDirty && !saving && !deleting);

  useEffect(() => {
    let active = true;
    setLoadState('loading');
    getProjectEditorData(isNew ? null : projectId).then((data) => {
      if (!active) return;
      setValues(data.project);
      setTechnologies(data.technologies);
      setTechnologyIds(data.selectedTechnologyIds);
      setNewTechnologyNames([]);
      initialState.current = projectState(data.project, data.selectedTechnologyIds, []);
      setLoadState('ready');
    }).catch((loadError) => {
      if (!active) return;
      setError(loadError.message || 'The project editor could not be loaded.');
      setLoadState('error');
    });
    return () => { active = false; };
  }, [isNew, projectId, loadAttempt]);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave this page and discard them?')) blocker.proceed();
    else blocker.reset();
  }, [blocker.state, blocker.proceed, blocker.reset]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeClose = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeClose);
    return () => window.removeEventListener('beforeunload', warnBeforeClose);
  }, [isDirty]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const toggleTechnology = (id) => {
    setTechnologyIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const addTechnology = (event) => {
    event.preventDefault();
    const name = newTechnologyName.trim();
    if (!name) return;
    const existing = technologies.find((technology) => technology.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existing) {
      setTechnologyIds((current) => current.includes(existing.id) ? current : [...current, existing.id]);
    } else {
      setNewTechnologyNames((current) => current.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()) ? current : [...current, name]);
    }
    setNewTechnologyName('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (mediaPending && !mediaAltReady) {
      const altInput = document.getElementById(`project-media-alt-new-${projectId}`);
      altInput?.focus();
      return;
    }
    const errors = validateProject(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }
    setSaving(true);
    setError('');
    const isCreating = isNew && !createdProjectId;
    const targetProjectId = createdProjectId || projectId;
    try {
      if (!isCreating && pendingMediaUploadRef.current) {
        const uploadedMedia = await pendingMediaUploadRef.current?.(targetProjectId);
        if (!uploadedMedia) {
          setSaving(false);
          return;
        }
      }
      const savedId = await saveProject(isCreating ? null : targetProjectId, values, technologyIds, newTechnologyNames);
      if (isCreating) setCreatedProjectId(savedId);
      if (isCreating && pendingMediaUploadRef.current) {
        const uploadedMedia = await pendingMediaUploadRef.current(savedId);
        if (!uploadedMedia) {
          setError('Project saved. Fix the image issue above, then save again to retry the upload.');
          return;
        }
      }
      initialState.current = currentState;
      try {
        const savedData = await getProjectEditorData(savedId);
        setValues(savedData.project);
        setTechnologies(savedData.technologies);
        setTechnologyIds(savedData.selectedTechnologyIds);
        setNewTechnologyNames([]);
        initialState.current = projectState(savedData.project, savedData.selectedTechnologyIds, []);
      } catch {
        setError('Project saved. Reload this page to refresh its technology list.');
      }
      if (isNew) navigate(`/admin/projects/${savedId}`, { replace: true });
      else navigate(location.pathname, { replace: true });
    } catch (saveError) {
      setError(saveError.message || 'The project could not be saved. Your changes are still here.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const targetProjectId = createdProjectId || projectId;
    if (!window.confirm(`Permanently delete “${values.name}” and all its stored files? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await permanentlyDeleteProject(targetProjectId);
      navigate('/admin/projects', { replace: true });
    } catch (deleteError) {
      setError(deleteError.message || 'The project could not be completely deleted. Retry to finish.');
      setDeleting(false);
    }
  };

  const hasSavedProject = !isNew || Boolean(createdProjectId);
  const title = hasSavedProject ? 'Edit project' : 'Add project';
  const renderProjectField = ([name, label, required]) => {
    const isStatus = name === 'status';
    const isUrl = name === 'repository_url' || name === 'live_demo_url';
    const isMultiline = ['short_description', 'long_description', 'key_features', 'technical_details', 'challenges_and_solutions', 'what_i_learned'].includes(name);
    return <div className={`admin-field${isMultiline ? ' is-wide' : ''}`} key={name}>
      <label htmlFor={name}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {isStatus ? <select id={name} name={name} value={values[name]} onChange={updateField} required aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}>
        <option value="">Choose status</option><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
      </select> : isMultiline ? <textarea id={name} name={name} value={values[name]} onChange={updateField} rows={name === 'short_description' ? 2 : 4} required={required} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `${name}-error` : undefined} /> : <input id={name} name={name} type={isUrl ? 'url' : 'text'} value={values[name]} onChange={updateField} required={required} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `${name}-error` : undefined} />}
      {fieldErrors[name] && <span className="admin-field-error" id={`${name}-error`}>{fieldErrors[name]}</span>}
    </div>;
  };
  return <AdminLayout title={title}>
    <Link className="button button-secondary admin-editor-back" to="/admin/projects">Back to Projects</Link>
    {loadState === 'loading' ? <p role="status">Loading project…</p> : loadState === 'error' ? <div className="admin-error-panel" role="alert">
      <p>{error}</p>
      <button className="button button-secondary" type="button" onClick={() => { setError(''); setLoadAttempt((count) => count + 1); }}>Retry</button>
    </div> : <>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <form className="admin-project-form" onSubmit={handleSave} noValidate>
        <div className="admin-project-fields">
          <div className="admin-project-primary-row">
            <div className="admin-project-primary-fields">
              {renderProjectField(PROJECT_FIELDS.find(([name]) => name === 'name'))}
              {renderProjectField(PROJECT_FIELDS.find(([name]) => name === 'short_description'))}
            </div>
            <fieldset className="admin-technology-picker">
              <legend>Technologies</legend>
              {technologies.length === 0 && newTechnologyNames.length === 0 ? <p className="admin-list-help">No technologies have been used yet. Add one below.</p> : <div className="admin-technology-options">
                {technologies.map((technology) => <label className="admin-technology-option" key={technology.id}>
                  <input type="checkbox" checked={technologyIds.includes(technology.id)} onChange={() => toggleTechnology(technology.id)} />{technology.name}
                </label>)}
              </div>}
              {newTechnologyNames.length > 0 && <ul className="admin-new-technologies" aria-label="New technologies to add">{newTechnologyNames.map((technologyName) => <li key={technologyName}>
                {technologyName}<button className="admin-remove-technology" type="button" onClick={() => setNewTechnologyNames((current) => current.filter((item) => item !== technologyName))} aria-label={`Remove ${technologyName}`}>Remove</button>
              </li>)}</ul>}
              <div className="admin-add-technology"><label htmlFor="new-technology">Add a reusable technology</label><div><input id="new-technology" value={newTechnologyName} onChange={(event) => setNewTechnologyName(event.target.value)} /><button className="button button-secondary" type="button" onClick={addTechnology} disabled={!newTechnologyName.trim()}>Add</button></div></div>
            </fieldset>
          </div>
          {PROJECT_FIELDS.slice(2).map(renderProjectField)}
        </div>
        <ProjectMediaManager projectId={createdProjectId || (isNew ? null : projectId)} onPendingChange={(pending, altReady) => { setMediaPending(pending); setMediaAltReady(altReady); }} onRegisterPendingUpload={(upload) => { pendingMediaUploadRef.current = upload; }} />
        <div className="admin-editor-actions">
          <button className="button admin-primary-button" type="submit" disabled={saving || deleting || (mediaPending && !mediaAltReady)}>{saving ? 'Saving…' : 'Save project'}</button>
          {hasSavedProject && <button className="button button-danger" type="button" disabled={saving || deleting} onClick={handleDelete}>{deleting ? 'Deleting…' : 'Delete project'}</button>}
        </div>
      </form>
    </>}
  </AdminLayout>;
}

export function AdminSectionPlaceholder({ title }) {
  const sectionId = title.toLowerCase();
  return <AdminLayout title={title} activeSection={sectionId}>
    <p className="page-intro">This dashboard section will be implemented in a later task.</p>
  </AdminLayout>;
}
