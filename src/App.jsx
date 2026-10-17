import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { getCachedPublicPortfolio, getPublicPortfolio } from './lib/public-content.js';
import { AdminCallbackPage, AdminLoginPage, AdminReadyPage, PasswordRecoveryPage, RequireAdmin } from './admin/auth-pages.jsx';
import { AdminProjectEditor, AdminProjectsPage, AdminSectionPlaceholder } from './admin/projects-page.jsx';
import { AdminProfilePage } from './admin/profile-page.jsx';

const SITE_OWNER_NAME = 'Your Name';

const navigation = [
  { label: 'Home', to: '/#home', section: 'home' },
  { label: 'Projects', to: '/#projects', section: 'projects' },
  { label: 'About', to: '/#about', section: 'about' },
  { label: 'Contact', to: '/#contact', section: 'contact' },
];

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef(null);
  const navigationRef = useRef(null);
  const location = useLocation();
  const activeSection = location.pathname.startsWith('/projects/')
    ? 'projects'
    : location.pathname === '/'
      ? (location.hash.slice(1) || 'home')
      : null;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const focusableItems = () => [...(navigationRef.current?.querySelectorAll('a[href], button:not([disabled])') ?? [])];
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
    const breakpoint = window.matchMedia('(min-width: 640px)');
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

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="site-brand" to="/" aria-label="Developer Portfolio home">
          Developer Portfolio
        </Link>
        <button
          className="menu-toggle"
          type="button"
          ref={menuToggleRef}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-toggle-label">{menuOpen ? 'Close' : 'Menu'}</span>
          <span className="menu-icon" aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
        <nav
          className={`primary-navigation${menuOpen ? ' is-open' : ''}`}
          id="primary-navigation"
          ref={navigationRef}
          aria-label="Main navigation"
        >
          {navigation.map(({ label, to, section }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link${activeSection === section ? ' is-active' : ''}`}
              aria-current={activeSection === section ? 'location' : undefined}
              onClick={() => {
                setMenuOpen(false);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  document.getElementById(section)?.scrollIntoView({ block: 'start' });
                }));
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {menuOpen && <button className="public-menu-backdrop" type="button" tabIndex={-1} aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </header>
  );
}

function PageLayout({ eyebrow, title, children, backToProjects = false, panel = false }) {
  return (
    <section className="page-section" aria-labelledby="page-title">
      {backToProjects && <Link className="text-link project-back-link" to="/#projects">Back to Projects</Link>}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className={panel ? 'project-detail-panel' : undefined}>
        <h1 id="page-title">{title}</h1>
        {children}
      </div>
    </section>
  );
}

function HomePage() {
  const [portfolio, setPortfolio] = useState(getCachedPublicPortfolio);
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setLoadError(null);
    getPublicPortfolio()
      .then((result) => { if (current) setPortfolio(result); })
      .catch((error) => { if (current) setLoadError(error); });
    return () => { current = false; };
  }, [attempt]);

  if (loadError && !portfolio) {
    const message = loadError.code === 'SUPABASE_NOT_CONFIGURED'
      ? loadError.message
      : 'The portfolio service could not be reached. Check your connection and try again.';
    return <ServiceUnavailablePage message={message} onRetry={() => setAttempt((value) => value + 1)} />;
  }

  if (!portfolio) return <LoadingPage title="Loading portfolio" />;

  return (
    <>
      <section className="page-section" id="home" aria-labelledby="home-title">
        <h1 className="home-name" id="home-title">{SITE_OWNER_NAME}</h1>
        <p className="page-intro">{portfolio.intro || 'A portfolio introduction has not been added yet.'}</p>
      </section>
      <ProjectsSection projects={portfolio.projects} />
      <section className="page-section content-section" id="about" aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <AboutContent profile={portfolio.profile} education={portfolio.education} experience={portfolio.experience} categories={portfolio.skillCategories} />
      </section>
      <section className="page-section content-section" id="contact" aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <p className="empty-state">Contact details aren’t available yet.</p>
      </section>
    </>
  );
}

function ProjectsSection({ projects }) {
  return (
    <section className="page-section content-section" id="projects" aria-labelledby="projects-title">
      <h2 id="projects-title">Featured Projects</h2>
      {projects.length === 0 ? (
        <p className="empty-state">No projects yet.</p>
      ) : (
        <div className="project-list project-grid">
          {projects.map((project) => <ProjectEntry key={project.id} project={project} />)}
        </div>
      )}
    </section>
  );
}

function ProjectEntry({ project }) {
  const status = project.status === 'planning' ? 'Planning' : project.status === 'in_progress' ? 'In progress' : 'Completed';
  return (
    <article className="project-entry">
      {project.image && (
        <img className="project-image" src={project.image.url} alt={project.image.alt_text} loading="lazy" />
      )}
      <div className="project-copy">
        <div className="project-heading">
          <h3>{project.name}</h3>
          <span className="status-tag">{status}</span>
        </div>
        <p>{project.shortDescription}</p>
        {project.technologies.length > 0 && (
          <ul className="technology-list" aria-label={`${project.name} technologies`}>
            {project.technologies.map((technology) => <li className="technology-tag" key={technology}>{technology}</li>)}
          </ul>
        )}
        <div className="project-actions">
          {project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer">Repository<span className="visually-hidden"> (opens in a new tab)</span></a>}
          {project.liveDemoUrl && <a href={project.liveDemoUrl} target="_blank" rel="noreferrer">Live demo<span className="visually-hidden"> (opens in a new tab)</span></a>}
          {project.slug && <Link to={`/projects/${project.slug}`}>View details</Link>}
        </div>
      </div>
    </article>
  );
}

function Skills({ categories }) {
  if (categories.length === 0) return null;
  return (
    <div className="content-block skills-section">
      <h3 className="skills-heading">Skills</h3>
      {categories.map((category) => (
        <div className="skill-category" key={category.id}>
          <h4>{category.name}</h4>
          <ul className="technology-list">
            {category.skills.map((skill) => <li className="technology-tag" key={skill.id}>{skill.name}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AboutContent({ profile, education, experience, categories }) {
  const hasIntro = Boolean(profile.intro || profile.photoUrl);
  return (
    <>
      {hasIntro && <div className={`profile-intro${profile.photoUrl ? ' has-photo' : ''}`}>
        {profile.intro && <p className="profile-intro-copy">{profile.intro}</p>}
        {profile.photoUrl && <img className="profile-photo" src={profile.photoUrl} alt="Portrait of the portfolio owner" loading="lazy" />}
      </div>}
      {profile.photoUrl && <hr className="profile-intro-divider" />}
      {education.length > 0 && <section className="profile-section" aria-labelledby="education-title">
        <h3 id="education-title">Education</h3>
        <div className="profile-entry-list">{education.map((entry) => <article className="profile-entry" key={entry.id}>
          <h4>{entry.qualification_or_course}</h4><p className="profile-entry-meta">{entry.institution}{entry.date_range && <> <span aria-hidden="true">·</span> {entry.date_range}</>}</p>
          {entry.description && <p className="profile-entry-description">{entry.description}</p>}
        </article>)}</div>
      </section>}
      {(categories.length > 0 || experience.length > 0) && <div className="profile-details-grid">
        <Skills categories={categories} />
        {experience.length > 0 && <section className="profile-section" aria-labelledby="experience-title">
          <h3 id="experience-title">Experience</h3>
          <div className="profile-entry-list">{experience.map((entry) => <article className="profile-entry" key={entry.id}>
            <h4>{entry.role}</h4><p className="profile-entry-meta">{entry.organization}{entry.date_range && <> <span aria-hidden="true">·</span> {entry.date_range}</>}</p>
            {entry.description && <p className="profile-entry-description">{entry.description}</p>}
          </article>)}</div>
        </section>}
      </div>}
      {profile.cvUrl && <div className="profile-cv-actions"><a className="button button-secondary cv-download" href={profile.cvUrl}>Download CV (PDF)</a></div>}
    </>
  );
}

function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    setProject(null);
    setNotFound(false);
    setError(false);
    getPublicPortfolio()
      .then((portfolio) => {
        if (!current) return;
        const match = portfolio.projects.find((item) => item.slug === slug || item.historicalSlugs.includes(slug));
        setProject(match ?? null);
        setNotFound(!match);
      })
      .catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [slug]);

  if (error) return <ServiceUnavailablePage message="The project could not be loaded. Please try again shortly." />;
  if (notFound) return <NotFoundPage project />;
  if (!project) return <LoadingPage title="Loading project" />;
  if (project.slug !== slug) return <Navigate to={`/projects/${project.slug}`} replace />;
  return (
    <PageLayout title={project.name} backToProjects panel>
      <p className="status-tag detail-status">{project.status === 'planning' ? 'Planning' : project.status === 'in_progress' ? 'In progress' : 'Completed'}</p>
      <p className="page-intro">{project.shortDescription}</p>
      <ProjectGallery project={project} />
      {project.technologies.length > 0 && (
        <div className="detail-block"><h2>Technologies</h2><ul className="technology-list">{project.technologies.map((item) => <li className="technology-tag" key={item}>{item}</li>)}</ul></div>
      )}
      {(project.repositoryUrl || project.liveDemoUrl) && (
        <div className="project-actions detail-actions">
          {project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer">Repository<span className="visually-hidden"> (opens in a new tab)</span></a>}
          {project.liveDemoUrl && <a href={project.liveDemoUrl} target="_blank" rel="noreferrer">Live demo<span className="visually-hidden"> (opens in a new tab)</span></a>}
        </div>
      )}
      {project.longDescription && <div className="detail-block"><h2>About this project</h2><p className="detail-copy">{project.longDescription}</p></div>}
      {[
        ['Key features', project.keyFeatures],
        ['Technical details', project.technicalDetails],
        ['Challenges and solutions', project.challengesAndSolutions],
        ['What I learned', project.whatILearned],
      ].filter(([, content]) => content?.trim()).map(([heading, content]) => (
        <div className="detail-block" key={heading}><h2>{heading}</h2><p className="detail-copy">{content}</p></div>
      ))}
      <Link className="text-link project-back-link project-back-bottom" to="/#projects">Back to Projects</Link>
    </PageLayout>
  );
}

function ProjectGallery({ project }) {
  const images = project.media;
  const [selected, setSelected] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const touchStartRef = useRef(null);
  const activeIndex = lightboxIndex ?? selected;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (lightboxIndex !== null && dialog && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    }
  }, [lightboxIndex]);

  if (!images.length) return null;
  const openLightbox = () => {
    triggerRef.current = document.activeElement;
    setLightboxIndex(selected);
  };
  const closeLightbox = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    setLightboxIndex(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const move = (direction) => {
    setLightboxIndex((index) => (index + direction + images.length) % images.length);
  };

  return (
    <div className="project-gallery" aria-label={`${project.name} screenshots`}>
      <button className="gallery-main-button" type="button" onClick={openLightbox} aria-label={`Open image viewer: ${images[selected].alt_text}`}>
        <img className="detail-image" src={images[selected].url} alt={images[selected].alt_text} />
      </button>
      {images.length > 1 && <div className="gallery-thumbnails" aria-label="Choose project image">
        {images.map((image, index) => <button className={`gallery-thumbnail${index === selected ? ' is-selected' : ''}`} type="button" key={image.id} onClick={() => setSelected(index)} aria-label={`Show image ${index + 1}: ${image.alt_text}`} aria-pressed={index === selected}>
          <img src={image.url} alt="" />
        </button>)}
      </div>}
      <dialog className="lightbox" ref={dialogRef} aria-label={`${project.name} image viewer`} onCancel={() => setLightboxIndex(null)} onClose={() => { setLightboxIndex(null); requestAnimationFrame(() => triggerRef.current?.focus()); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' && images.length > 1) { event.preventDefault(); move(-1); }
          if (event.key === 'ArrowRight' && images.length > 1) { event.preventDefault(); move(1); }
        }}
        onTouchStart={(event) => { touchStartRef.current = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          if (!start || images.length < 2) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
          touchStartRef.current = null;
        }}>
        <div className="lightbox-toolbar">
          <span aria-live="polite">Image {activeIndex + 1} of {images.length}</span>
          <button className="button button-secondary" ref={closeRef} type="button" onClick={closeLightbox}>Close image viewer</button>
        </div>
        {images.length > 1 && <button className="lightbox-nav lightbox-previous" type="button" onClick={() => move(-1)} aria-label="Previous image">‹</button>}
        <img className="lightbox-image" src={images[activeIndex].url} alt={images[activeIndex].alt_text} />
        {images.length > 1 && <button className="lightbox-nav lightbox-next" type="button" onClick={() => move(1)} aria-label="Next image">›</button>}
      </dialog>
    </div>
  );
}

function NotFoundPage({ project = false }) {
  return (
    <PageLayout eyebrow="404" title={project ? 'Project not found' : 'Page not found'}>
      <p className="page-intro">{project ? 'This project may have been removed or the address may be incorrect.' : 'That address doesn’t match a page on this site.'}</p>
      <Link className="text-link" to="/">Go to Home <span aria-hidden="true">→</span></Link>
    </PageLayout>
  );
}

function LoadingPage({ title = 'Loading' }) {
  return (
    <PageLayout eyebrow="Please wait" title={title}>
      <p className="empty-state" role="status" aria-live="polite">Loading content…</p>
    </PageLayout>
  );
}

function ErrorPage({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <PageLayout eyebrow="Unable to continue" title="Something went wrong">
      <p className="page-intro" role="alert">{message}</p>
      {onRetry && <button className="button button-secondary" type="button" onClick={onRetry}>Try again</button>}
    </PageLayout>
  );
}

function ServiceUnavailablePage({ message = 'The portfolio service is unavailable. Please try again shortly.', onRetry }) {
  return (
    <PageLayout eyebrow="Temporary issue" title="Content can’t load right now">
      <p className="page-intro" role="alert">{message}</p>
      <button className="button button-secondary" type="button" onClick={onRetry ?? (() => window.location.reload())}>Retry</button>
    </PageLayout>
  );
}

function App() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (location.pathname !== '/') return;
    const targetId = location.hash.slice(1);
    if (!targetId) return;
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [location.pathname, location.hash]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      {!isAdminPath && <SiteHeader />}
      <main className={`main-content${isAdminPath ? ' admin-main-content' : ''}`} id="main-content" tabIndex="-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<Navigate to="/#projects" replace />} />
          <Route path="/projects/:slug" element={<ProjectDetailPage />} />
          <Route path="/about" element={<Navigate to="/#about" replace />} />
          <Route path="/contact" element={<Navigate to="/#contact" replace />} />
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/callback" element={<AdminCallbackPage />} />
          <Route path="/admin/reset-password" element={<PasswordRecoveryPage />} />
          <Route path="/admin/projects" element={<RequireAdmin><AdminProjectsPage /></RequireAdmin>} />
          <Route path="/admin/projects/new" element={<RequireAdmin><AdminProjectEditor isNew /></RequireAdmin>} />
          <Route path="/admin/projects/:projectId" element={<RequireAdmin><AdminProjectEditor /></RequireAdmin>} />
          <Route path="/admin/profile" element={<RequireAdmin><AdminProfilePage /></RequireAdmin>} />
          <Route path="/admin/homepage" element={<RequireAdmin><AdminSectionPlaceholder title="Homepage" /></RequireAdmin>} />
          <Route path="/admin/mailbox" element={<RequireAdmin><AdminSectionPlaceholder title="Mailbox" /></RequireAdmin>} />
          <Route path="/admin/*" element={<RequireAdmin><AdminReadyPage /></RequireAdmin>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isAdminPath && <footer className="site-footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} {SITE_OWNER_NAME}</span>
        </div>
      </footer>}
    </>
  );
}

export default App;

export { ErrorPage, LoadingPage, ServiceUnavailablePage };
