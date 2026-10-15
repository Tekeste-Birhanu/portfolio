import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { getCachedPublicPortfolio, getPublicPortfolio } from './lib/public-content.js';

const navigation = [
  { label: 'Home', to: '/#home', section: 'home' },
  { label: 'Projects', to: '/#projects', section: 'projects' },
  { label: 'About', to: '/#about', section: 'about' },
  { label: 'Contact', to: '/#contact', section: 'contact' },
];

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
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
          aria-label="Main navigation"
        >
          {navigation.map(({ label, to, section }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link${(location.hash === `#${section}` || (!location.hash && section === 'home')) ? ' is-active' : ''}`}
              aria-current={location.hash === `#${section}` || (!location.hash && section === 'home') ? 'location' : undefined}
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
    </header>
  );
}

function PageLayout({ eyebrow, title, children }) {
  return (
    <section className="page-section" aria-labelledby="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="page-title">{title}</h1>
      {children}
    </section>
  );
}

function HomePage() {
  const [searchParams] = useSearchParams();
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

  const featuredProjects = portfolio.projects.filter((project) => project.isFeatured);
  const showAllProjects = searchParams.get('projects') === 'all';
  return (
    <>
      <section className="page-section" id="home" aria-labelledby="home-title">
        <p className="eyebrow">Developer Portfolio</p>
        <h1 id="home-title">Hello, I’m a developer.</h1>
        <p className="page-intro">{portfolio.intro || 'A portfolio introduction has not been added yet.'}</p>
        <p><Link className="text-link" to="/?projects=all#projects">Browse projects <span aria-hidden="true">→</span></Link></p>
        {featuredProjects.length > 0 && (
          <section className="content-block" aria-labelledby="featured-heading">
            <h2 id="featured-heading">Featured projects</h2>
            <div className="project-list">
              {featuredProjects.map((project) => <ProjectEntry key={project.id} project={project} />)}
            </div>
          </section>
        )}
        <Skills categories={portfolio.skillCategories} />
      </section>
      <ProjectsSection projects={portfolio.projects} expandedInitially={showAllProjects} />
      <section className="page-section content-section" id="about" aria-labelledby="about-title">
        <p className="eyebrow">Background</p>
        <h2 id="about-title">About</h2>
        <p className="empty-state">About information isn’t available yet.</p>
      </section>
      <section className="page-section content-section" id="contact" aria-labelledby="contact-title">
        <p className="eyebrow">Get in touch</p>
        <h2 id="contact-title">Contact</h2>
        <p className="empty-state">Contact details aren’t available yet.</p>
      </section>
    </>
  );
}

function ProjectsSection({ projects, expandedInitially }) {
  const [expanded, setExpanded] = useState(expandedInitially);
  useEffect(() => setExpanded(expandedInitially), [expandedInitially]);
  const featured = projects.filter((project) => project.isFeatured);
  const visibleProjects = expanded ? projects : featured;

  return (
    <section className="page-section content-section" id="projects" aria-labelledby="projects-title">
      <p className="eyebrow">Portfolio</p>
      <h2 id="projects-title">Projects</h2>
      {projects.length === 0 ? (
        <p className="empty-state">No projects yet.</p>
      ) : (
        <>
          {visibleProjects.length === 0 && <p className="empty-state">No projects are featured yet.</p>}
          <div className="project-list">
            {visibleProjects.map((project) => <ProjectEntry key={project.id} project={project} />)}
          </div>
          {!expanded && projects.length > featured.length && (
            <button className="button button-secondary expand-projects" type="button" onClick={() => setExpanded(true)}>
              Expand to all
            </button>
          )}
        </>
      )}
    </section>
  );
}

function ProjectEntry({ project }) {
  const status = project.status === 'in_progress' ? 'In progress' : 'Completed';
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
    <section className="content-block skills-section" aria-labelledby="skills-heading">
      <h2 id="skills-heading">Skills</h2>
      {categories.map((category) => (
        <div className="skill-category" key={category.id}>
          <h3>{category.name}</h3>
          <ul className="technology-list">
            {category.skills.map((skill) => <li className="technology-tag" key={skill.id}>{skill.name}</li>)}
          </ul>
        </div>
      ))}
    </section>
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
        const match = portfolio.projects.find((item) => item.slug === slug);
        setProject(match ?? null);
        setNotFound(!match);
      })
      .catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [slug]);

  if (error) return <ServiceUnavailablePage message="The project could not be loaded. Please try again shortly." />;
  if (notFound) return <NotFoundPage project />;
  if (!project) return <LoadingPage title="Loading project" />;
  return (
    <PageLayout eyebrow="Project" title={project.name}>
      <p className="status-tag detail-status">{project.status === 'in_progress' ? 'In progress' : 'Completed'}</p>
      <p className="page-intro">{project.shortDescription}</p>
      {project.image && <img className="detail-image" src={project.image.url} alt={project.image.alt_text} />}
      {project.technologies.length > 0 && <p>Technologies: {project.technologies.join(', ')}</p>}
      <p className="empty-state">More project details will be available here soon.</p>
      <Link className="text-link" to="/#projects">Back to projects</Link>
    </PageLayout>
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
      <SiteHeader />
      <main className="main-content" id="main-content" tabIndex="-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<Navigate to="/#projects" replace />} />
          <Route path="/projects/:slug" element={<ProjectDetailPage />} />
          <Route path="/about" element={<Navigate to="/#about" replace />} />
          <Route path="/contact" element={<Navigate to="/#contact" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} Your Name</span>
        </div>
      </footer>
    </>
  );
}

export default App;

export { ErrorPage, LoadingPage, ServiceUnavailablePage };
