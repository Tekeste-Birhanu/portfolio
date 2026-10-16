import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from './auth-context.jsx';
import { supabase } from '../lib/supabase.js';

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
        <Link className="admin-brand" to="/admin/projects">Administrator</Link>
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

  const persistOrder = async (nextProjects) => {
    if (!supabase) return;
    setBusyId('ordering');
    setActionError('');
    setProjects(nextProjects);
    const results = await Promise.all(nextProjects.map((project, index) =>
      supabase.from('projects').update({ sort_order: index + 1 }).eq('id', project.id),
    ));
    if (results.some(({ error }) => error)) {
      setActionError('The new order could not be fully saved. Reloaded the saved order; please try again.');
      await loadProjects();
    } else {
      setProjects(nextProjects.map((project, index) => ({ ...project, sort_order: index + 1 })));
    }
    setBusyId(null);
  };

  const moveProject = (projectId, targetId) => {
    if (!projects || projectId === targetId || busyId) return;
    const from = projects.findIndex((project) => project.id === projectId);
    const to = projects.findIndex((project) => project.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...projects];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next);
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
      <p className="admin-list-help" id="project-order-help">{isFiltered ? 'Clear the search to reorder projects. ' : 'Drag projects to set the order shown on the public homepage.'}</p>
      <ul className="admin-project-list" aria-describedby="project-order-help">
        {visibleProjects.map((project) => {
          return <li
          className={`admin-project-row${draggedId === project.id ? ' is-dragging' : ''}`}
          key={project.id}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); if (draggedId) moveProject(draggedId, project.id); setDraggedId(null); }}
        >
          <span className="admin-drag-handle" draggable={busyId === null && !isFiltered} onDragStart={(event) => { setDraggedId(project.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', project.id); }} onDragEnd={() => setDraggedId(null)} aria-hidden="true" title="Drag to reorder">⠿</span>
          <div className="admin-project-main">
            <h2>{project.name}</h2>
            <p>Last updated <time dateTime={project.updated_at}>{formatUpdatedAt(project.updated_at)}</time></p>
          </div>
          <div className="admin-row-actions">
            <Link className="button button-secondary admin-edit-link" to={`/admin/projects/${project.id}`}>Edit</Link>
          </div>
          </li>;
        })}
      </ul>
      {busyId === 'ordering' && <p role="status" aria-live="polite">Saving project order…</p>}
    </>}
  </AdminLayout>;
}

export function AdminProjectPlaceholder({ isNew = false }) {
  return <AdminLayout title={isNew ? 'Add project' : 'Edit project'}>
    <p className="page-intro">The project editor is the next implementation step.</p>
    <Link className="button button-secondary" to="/admin/projects">Back to Projects</Link>
  </AdminLayout>;
}

export function AdminSectionPlaceholder({ title }) {
  const sectionId = title.toLowerCase();
  return <AdminLayout title={title} activeSection={sectionId}>
    <p className="page-intro">This dashboard section will be implemented in a later task.</p>
  </AdminLayout>;
}
