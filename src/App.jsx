import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

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
  return (
    <>
      <section className="page-section" id="home" aria-labelledby="home-title">
        <p className="eyebrow">Developer Portfolio</p>
        <h1 id="home-title">Hello, I’m a developer.</h1>
        <p className="page-intro">This portfolio is being set up. Project work and profile details will appear here.</p>
        <p><Link className="text-link" to="/#projects">Browse projects <span aria-hidden="true">→</span></Link></p>
      </section>
      <section className="page-section content-section" id="projects" aria-labelledby="projects-title">
        <p className="eyebrow">Portfolio</p>
        <h2 id="projects-title">Projects</h2>
        <p className="page-intro">Selected projects and the details behind them.</p>
        <p className="empty-state">No projects yet.</p>
      </section>
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

function ServiceUnavailablePage() {
  return (
    <PageLayout eyebrow="Temporary issue" title="Content can’t load right now">
      <p className="page-intro">The portfolio service is unavailable. Please try again shortly.</p>
      <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>
        Retry
      </button>
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
          <Route path="/projects/:slug" element={<NotFoundPage project />} />
          <Route path="/about" element={<Navigate to="/#about" replace />} />
          <Route path="/contact" element={<Navigate to="/#contact" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner"><span>Developer Portfolio</span><span>Built with care.</span></div>
      </footer>
    </>
  );
}

export default App;

export { ErrorPage, LoadingPage, ServiceUnavailablePage };
