import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  getCachedPublicAbout,
  getCachedPublicContact,
  getCachedPublicProjects,
} from "./lib/public-content-cache.js";
import { NotFoundPage, LoadingPage } from "./public-page-states.jsx";
import {
  PublicAboutSkeleton,
  PublicContactSkeleton,
  PublicProjectsSkeleton,
} from "./skeletons.jsx";

const ProjectDetailPage = lazy(() => import("./project-detail-page.jsx"));
const loadPublicProjects = () =>
  import("./lib/public-content.js").then(({ getPublicProjects }) =>
    getPublicProjects(),
  );
const loadPublicAbout = () =>
  import("./lib/public-content.js").then(({ getPublicAbout }) =>
    getPublicAbout(),
  );
const loadPublicContact = () =>
  import("./lib/public-content.js").then(({ getPublicContact }) =>
    getPublicContact(),
  );

const SITE_OWNER_NAME = "Tekeste Birhanu";
const HERO_ROLE = "Software Developer";
const HERO_INTRO =
  "Learning by building, growing with every project, and exploring new ways to create smarter digital experiences – from building intuitive interfaces to exploring AI-powered solutions.";

const navigation = [
  { label: "Home", to: "/#home", section: "home", icon: "home" },
  {
    label: "Projects",
    to: "/#projects",
    section: "projects",
    icon: "projects",
  },
  { label: "About", to: "/#about", section: "about", icon: "about" },
  { label: "Contact", to: "/#contact", section: "contact", icon: "contact" },
];

function NavigationIcon({ name }) {
  const shape = {
    home: (
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    ),
    projects: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </>
    ),
    about: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    contact: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
  }[name];

  return (
    <svg
      className="navigation-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shape}
    </svg>
  );
}

function ContactMethodIcon({ icon }) {
  const shape = {
    email: (
      <>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m4 7 8 6 8-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </>
    ),
    phone: (
      <path
        d="M7.2 3.5h2.4l1.2 4.1-1.8 1.5a15 15 0 0 0 5.9 5.9l1.5-1.8 4.1 1.2v2.4a2 2 0 0 1-2.2 2A17 17 0 0 1 5.2 5.7a2 2 0 0 1 2-2.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ),
    website: (
      <>
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M3.5 12h17M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </>
    ),
    github: (
      <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.13.68-3.8-1.33-3.8-1.33-.52-1.3-1.26-1.65-1.26-1.65-1.03-.71.08-.7.08-.7 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.63 1.23 3.28.94.1-.73.4-1.23.71-1.51-2.5-.29-5.12-1.26-5.12-5.59 0-1.24.44-2.24 1.17-3.03-.12-.29-.51-1.44.11-2.99 0 0 .95-.31 3.09 1.16a10.7 10.7 0 0 1 5.62 0c2.14-1.47 3.08-1.16 3.08-1.16.62 1.55.23 2.7.12 2.99.72.79 1.16 1.79 1.16 3.03 0 4.34-2.63 5.29-5.15 5.57.4.36.76 1.04.76 2.1v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
    ),
    linkedin: (
      <>
        <circle cx="5.1" cy="5.2" r="2" />
        <path d="M3.3 8.4h3.6v12H3.3zM9.1 8.4h3.4V10h.05c.48-.91 1.64-1.87 3.38-1.87 3.61 0 4.28 2.37 4.28 5.45v6.82h-3.61v-6.05c0-1.45-.03-3.32-2.03-3.32-2.04 0-2.35 1.59-2.35 3.21v6.16H9.1z" />
      </>
    ),
    youtube: (
      <>
        <rect
          x="2.2"
          y="5"
          width="19.6"
          height="14"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="m10 9 5.5 3-5.5 3z" />
      </>
    ),
    telegram: (
      <path d="m2.7 11.4 17.6-7.1c.9-.35 1.7.22 1.4 1.5l-3 14.1c-.22 1-.83 1.25-1.68.78l-4.65-3.43-2.24 2.16c-.25.25-.46.46-.94.46l.33-4.73 8.61-7.78c.37-.33-.08-.52-.57-.19L6.92 12.9l-4.58-1.43c-.99-.31-1-1 .36-1.54Z" />
    ),
    instagram: (
      <>
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="17.6" cy="6.5" r="1" />
      </>
    ),
    x: (
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-7.1L5.9 22H2.8l7.3-8.4L2.3 2h6.3l4.3 6.5L18.9 2Zm-1.1 18h1.7L7.5 3.9H5.7L17.8 20Z" />
    ),
    facebook: (
      <path d="M13.6 22v-8.8h3l.45-3.45H13.6V7.55c0-1 .28-1.68 1.73-1.68h1.85V2.78A24 24 0 0 0 14.5 2.6c-2.66 0-4.48 1.62-4.48 4.6v2.55H7v3.45h3.02V22h3.58Z" />
    ),
    whatsapp: (
      <>
        <path
          d="M20.4 11.7a8.3 8.3 0 0 1-12.3 7.2L3 20l1.15-4.9a8.3 8.3 0 1 1 16.25-3.4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8.3 7.7c.2-.45.45-.46.75-.46h.55c.18 0 .4.03.53.4l.75 1.8c.1.24.08.43-.08.63l-.53.65c-.16.19-.23.34-.08.6a7.5 7.5 0 0 0 2.1 2.1c.25.15.4.08.6-.08l.65-.53c.2-.16.39-.18.63-.08l1.8.75c.37.15.4.35.4.53v.55c0 .3-.01.55-.46.75-.45.2-1.6.45-3.6-.53a11.3 11.3 0 0 1-3.99-3.99c-.98-2-.73-3.15-.53-3.6Z"
          fill="currentColor"
        />
      </>
    ),
    discord: (
      <>
        <path d="M19.7 5.5a18 18 0 0 0-4.4-1.4l-.55 1.13a16 16 0 0 0-5.5 0L8.7 4.1a18 18 0 0 0-4.4 1.4C1.5 9.6.75 13.6 1.12 17.55a18 18 0 0 0 5.4 2.73l1.17-1.9a12 12 0 0 1-1.84-.9l.45-.35c3.55 1.63 7.4 1.63 10.9 0l.46.35a12 12 0 0 1-1.84.9l1.17 1.9a18 18 0 0 0 5.4-2.73c.44-4.58-.75-8.54-3.09-12.05Z" />
        <ellipse
          cx="9"
          cy="12.1"
          rx="1.4"
          ry="1.8"
          fill="currentColor"
          stroke="none"
        />
        <ellipse
          cx="15"
          cy="12.1"
          rx="1.4"
          ry="1.8"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
  }[icon] ?? (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  );

  return (
    <svg
      className="public-contact-icon-svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  );
}

function SiteHeader() {
  const [scrollActiveSection, setScrollActiveSection] = useState(null);
  const activeSectionRef = useRef(null);
  const location = useLocation();
  const activeSection = location.pathname.startsWith("/projects/")
    ? "projects"
    : location.pathname === "/"
      ? scrollActiveSection || location.hash.slice(1) || "home"
      : null;

  useEffect(() => {
    if (location.pathname !== "/") {
      activeSectionRef.current = null;
      setScrollActiveSection(null);
      return undefined;
    }

    const mainContent = document.getElementById("main-content");
    if (!mainContent) return undefined;

    let animationFrame = 0;
    const updateActiveSection = () => {
      animationFrame = 0;
      const sections = navigation
        .map(({ section }) => document.getElementById(section))
        .filter(Boolean);
      if (!sections.length) return;

      const activationPoint = window.scrollY + window.innerHeight * 0.28;
      let currentSection = sections[0];

      for (const section of sections) {
        if (
          section.getBoundingClientRect().top + window.scrollY >
          activationPoint
        )
          break;
        currentSection = section;
      }

      const candidateIndex = sections.indexOf(currentSection);
      const activeIndex = sections.findIndex(
        (section) => section.id === activeSectionRef.current,
      );
      if (activeIndex >= 0 && candidateIndex !== activeIndex) {
        const boundarySection =
          candidateIndex > activeIndex ? currentSection : sections[activeIndex];
        const boundary =
          boundarySection.getBoundingClientRect().top + window.scrollY;
        const hysteresis = 72;
        const crossedBoundary =
          candidateIndex > activeIndex
            ? activationPoint >= boundary + hysteresis
            : activationPoint <= boundary - hysteresis;
        if (!crossedBoundary) currentSection = sections[activeIndex];
      }

      if (activeSectionRef.current !== currentSection.id) {
        activeSectionRef.current = currentSection.id;
        setScrollActiveSection(currentSection.id);
      }
    };
    const scheduleUpdate = () => {
      if (!animationFrame)
        animationFrame = window.requestAnimationFrame(updateActiveSection);
    };
    const contentObserver = new MutationObserver(scheduleUpdate);
    contentObserver.observe(mainContent, { childList: true, subtree: true });

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      contentObserver.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [location.pathname]);

  return (
    <nav
      className="site-navigation"
      id="primary-navigation"
      aria-label="Main navigation"
    >
      <Link
        className="site-navigation-brand"
        to="/#home"
        aria-label={`${SITE_OWNER_NAME} home`}
      >
        <img src="/favicon.svg" alt="" />
      </Link>
      <div className="site-navigation-links">
        {navigation.map(({ label, to, section, icon }) => (
          <Link
            key={to}
            to={to}
            className={`nav-link${activeSection === section ? " is-active" : ""}`}
            aria-label={label}
            aria-current={activeSection === section ? "location" : undefined}
            title={label}
            onClick={() => {
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  document
                    .getElementById(section)
                    ?.scrollIntoView({ block: "start" });
                }),
              );
            }}
          >
            <span className="navigation-icon-wrap">
              <NavigationIcon name={icon} />
            </span>
            <span className="nav-link-label">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function useDeferredPublicContent(load, getCached, eager = false) {
  const sectionRef = useRef(null);
  const [data, setData] = useState(getCached);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (eager) return undefined;
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    let current = true;
    setError(null);
    load()
      .then((result) => {
        if (current) setData(result);
      })
      .catch((loadError) => {
        if (current) setError(loadError);
      });
    return () => {
      current = false;
    };
  }, [load, shouldLoad, attempt]);

  return {
    sectionRef,
    data,
    error,
    loading: shouldLoad && !data && !error,
    retry: () => setAttempt((value) => value + 1),
  };
}

function SectionLoadError({ label, onRetry }) {
  return (
    <p className="public-section-error" role="alert">
      {label} could not be loaded.{" "}
      <button className="text-link" type="button" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function HomePage() {
  const projectsData = useDeferredPublicContent(
    loadPublicProjects,
    getCachedPublicProjects,
  );
  const aboutData = useDeferredPublicContent(
    loadPublicAbout,
    getCachedPublicAbout,
  );
  const contactData = useDeferredPublicContent(
    loadPublicContact,
    getCachedPublicContact,
  );
  const heroPhoto = "/profile-placeholder.jpg";

  return (
    <>
      <section
        className="page-section home-hero has-photo"
        id="home"
        aria-labelledby="home-title"
      >
        <div className="home-hero-copy">
          <h1 className="home-name" id="home-title">
            {SITE_OWNER_NAME}
          </h1>
          <p className="home-role">{HERO_ROLE}</p>
          <p className="page-intro">{HERO_INTRO}</p>
          <div className="home-hero-actions">
            <a className="button home-cta-primary" href="/#contact">
              Get in touch
            </a>
            <a
              className="button button-secondary"
              href="https://github.com/Tekeste-Birhanu"
              target="_blank"
              rel="noreferrer"
            >
              View my GitHub
            </a>
          </div>
        </div>
        <div className="home-hero-badge">
          <img
            className="home-hero-photo"
            src={heroPhoto}
            alt="Portrait of the portfolio owner"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </section>
      <ProjectsSection
        sectionRef={projectsData.sectionRef}
        projects={projectsData.data}
        loading={projectsData.loading}
        error={projectsData.error}
        onRetry={projectsData.retry}
      />
      <section
        className="page-section content-section"
        id="about"
        aria-labelledby="about-title"
        ref={aboutData.sectionRef}
      >
        <h2 id="about-title">About Me</h2>
        {aboutData.loading && <PublicAboutSkeleton />}
        {aboutData.error && !aboutData.data && (
          <SectionLoadError label="About Me" onRetry={aboutData.retry} />
        )}
        {aboutData.data && (
          <AboutContent
            profile={aboutData.data.profile}
            experience={aboutData.data.experience}
            categories={aboutData.data.skillCategories}
          />
        )}
      </section>
      <section
        className="page-section content-section"
        id="contact"
        aria-labelledby="contact-title"
        ref={contactData.sectionRef}
      >
        <h2 id="contact-title">Contact Me</h2>
        <ContactSection
          methods={contactData.data ?? []}
          methodsLoading={contactData.loading}
          methodsError={contactData.error}
          methodsAvailable={contactData.data !== null}
          onRetryMethods={contactData.retry}
        />
      </section>
    </>
  );
}

function ContactSection({
  methods,
  methodsLoading,
  methodsError,
  methodsAvailable,
  onRetryMethods,
}) {
  const [visitorEmail, setVisitorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const emailMethod = methods.find((method) => method.icon === "email");
  const fallbackEmail = emailMethod?.href.startsWith("mailto:")
    ? emailMethod.href.slice(7)
    : "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = visitorEmail.trim();
    const normalizedMessage = message.trim();
    const nextErrors = {};
    if (
      !normalizedEmail ||
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      nextErrors.email = "Enter a valid email address (up to 254 characters).";
    }
    const messageLength = Array.from(normalizedMessage).length;
    if (!normalizedMessage) nextErrors.message = "Enter a message.";
    else if (messageLength > 5000)
      nextErrors.message = "Keep your message to 5,000 characters or fewer.";
    setFieldErrors(nextErrors);
    setError("");
    setSuccess("");
    if (Object.keys(nextErrors).length) {
      document
        .getElementById(nextErrors.email ? "contact-email" : "contact-message")
        ?.focus();
      return;
    }

    setSending(true);
    try {
      const { submitContactMessage } = await import("./lib/contact-submit.js");
      await submitContactMessage(normalizedEmail, normalizedMessage);
      setVisitorEmail("");
      setMessage("");
      setFieldErrors({});
      setSuccess("Your message has been saved. Thank you for reaching out.");
    } catch {
      setError("Your message could not be saved. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="public-contact-grid">
      <section className="public-contact-panel" aria-label="Contact methods">
        {methodsLoading ? (
          <PublicContactSkeleton />
        ) : methodsError && !methodsAvailable ? (
          <SectionLoadError label="Contact details" onRetry={onRetryMethods} />
        ) : methods.length ? (
          <ul className="public-contact-methods">
            {methods.map((method) => (
              <li key={method.id}>
                <span className="public-contact-icon">
                  <ContactMethodIcon icon={method.icon} />
                </span>
                <span className="public-contact-label">{method.label}:</span>
                <a
                  href={method.href}
                  target={method.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    method.href.startsWith("http") ? "noreferrer" : undefined
                  }
                >
                  {method.value}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Contact details aren’t available yet.</p>
        )}
      </section>
      <section
        className="public-contact-panel"
        aria-labelledby="contact-form-title"
      >
        <h3 id="contact-form-title">Send a message</h3>
        {error && (
          <p className="contact-form-error" role="alert">
            {error}
            {fallbackEmail && (
              <>
                {" "}
                You can email{" "}
                <a href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a> instead.
              </>
            )}
          </p>
        )}
        {success && (
          <p className="contact-form-success" role="status">
            {success}
          </p>
        )}
        <form
          className="contact-form"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <label htmlFor="contact-email">Your email</label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={visitorEmail}
            required
            disabled={sending}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "contact-email-error" : undefined
            }
            onChange={(event) => {
              setVisitorEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: "" }));
              setError("");
              setSuccess("");
            }}
          />
          {fieldErrors.email && (
            <p className="contact-field-error" id="contact-email-error">
              {fieldErrors.email}
            </p>
          )}
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            rows="4"
            value={message}
            required
            disabled={sending}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={
              fieldErrors.message
                ? "contact-message-error"
                : "contact-message-count"
            }
            onChange={(event) => {
              setMessage(event.target.value);
              setFieldErrors((current) => ({ ...current, message: "" }));
              setError("");
              setSuccess("");
            }}
          />
          {fieldErrors.message && (
            <p className="contact-field-error" id="contact-message-error">
              {fieldErrors.message}
            </p>
          )}
          <p className="contact-character-count" id="contact-message-count">
            {Array.from(message).length} / 5,000
          </p>
          <button
            className="button home-cta-primary"
            type="submit"
            disabled={sending}
          >
            {sending ? "Sending…" : "Send message"}
          </button>
        </form>
      </section>
    </div>
  );
}

function ProjectsSection({ sectionRef, projects, loading, error, onRetry }) {
  return (
    <section
      className="page-section content-section"
      id="projects"
      aria-labelledby="projects-title"
      ref={sectionRef}
    >
      <h2 id="projects-title">Featured Projects</h2>
      {loading && <PublicProjectsSkeleton />}
      {error && !projects && (
        <SectionLoadError label="Projects" onRetry={onRetry} />
      )}
      {projects && projects.length === 0 ? (
        <p className="empty-state">No projects yet.</p>
      ) : projects?.length > 0 ? (
        <div className="project-list project-grid">
          {projects.map((project) => (
            <ProjectEntry key={project.id} project={project} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProjectEntry({ project }) {
  const status =
    project.status === "planning"
      ? "Planning"
      : project.status === "in_progress"
        ? "In progress"
        : "Completed";
  return (
    <article className="project-entry">
      {project.image && (
        <img
          className="project-image"
          src={project.image.url}
          alt={project.image.alt_text}
          loading="lazy"
        />
      )}
      <div className="project-copy">
        <div className="project-heading">
          <h3>{project.name}</h3>
          <span className="status-tag">{status}</span>
        </div>
        <p>{project.shortDescription}</p>
        {project.technologies.length > 0 && (
          <ul
            className="technology-list"
            aria-label={`${project.name} technologies`}
          >
            {project.technologies.map((technology) => (
              <li className="technology-tag" key={technology}>
                {technology}
              </li>
            ))}
          </ul>
        )}
        <div className="project-actions">
          {project.repositoryUrl && (
            <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
              Repository
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          )}
          {project.liveDemoUrl && (
            <a href={project.liveDemoUrl} target="_blank" rel="noreferrer">
              Live demo
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          )}
          {project.slug && (
            <Link to={`/projects/${project.slug}`}>View details</Link>
          )}
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
          <ul className="skill-bullet-list">
            {category.skills.map((skill) => (
              <li key={skill.id}>{skill.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AboutContent({ profile, experience, categories }) {
  return (
    <>
      {(profile.intro || profile.cvUrl) && (
        <div className="profile-intro-cv-grid">
          {profile.intro && (
            <div className="profile-intro">
              <p className="profile-intro-copy">{profile.intro}</p>
            </div>
          )}
          {profile.cvUrl && (
            <div className="profile-section">
              <div className="profile-cv-actions">
                <a
                  className="button button-secondary cv-download"
                  href={profile.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview CV
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      {(categories.length > 0 || experience.length > 0) && (
        <div className="profile-details-grid">
          <Skills categories={categories} />
          {experience.length > 0 && (
            <section
              className="profile-section"
              aria-labelledby="experience-title"
            >
              <h3 id="experience-title">Experience</h3>
              <div className="profile-entry-list">
                {experience.map((entry) => (
                  <article className="profile-entry" key={entry.id}>
                    <h4>{entry.role}</h4>
                    <p className="profile-entry-meta">
                      {entry.organization}
                      {entry.date_range && (
                        <>
                          {" "}
                          <span aria-hidden="true">·</span> {entry.date_range}
                        </>
                      )}
                    </p>
                    {entry.description && (
                      <p className="profile-entry-description">
                        {entry.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function App() {
  const location = useLocation();
  const isReload = useRef(
    window.performance.getEntriesByType("navigation")[0]?.type === "reload",
  );

  useEffect(() => {
    const root = document.documentElement;
    let hideTimeout = 0;
    const showScrollbar = () => {
      root.classList.add("scrollbar-visible");
      window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(
        () => root.classList.remove("scrollbar-visible"),
        900,
      );
    };

    window.addEventListener("scroll", showScrollbar, { passive: true });
    return () => {
      window.removeEventListener("scroll", showScrollbar);
      window.clearTimeout(hideTimeout);
      root.classList.remove("scrollbar-visible");
    };
  }, []);

  useLayoutEffect(() => {
    if (isReload.current && location.pathname === "/") {
      isReload.current = false;
      let secondFrame = 0;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
      });
      return () => {
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame) window.cancelAnimationFrame(secondFrame);
      };
    }
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const targetId = location.hash.slice(1);
    if (!targetId) return;
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [location.pathname, location.hash]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main className="main-content" id="main-content" tabIndex="-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/projects"
            element={<Navigate to="/#projects" replace />}
          />
          <Route
            path="/projects/:slug"
            element={
              <Suspense fallback={<LoadingPage title="Loading project" />}>
                <ProjectDetailPage />
              </Suspense>
            }
          />
          <Route path="/about" element={<Navigate to="/#about" replace />} />
          <Route
            path="/contact"
            element={<Navigate to="/#contact" replace />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span>
            © {new Date().getFullYear()} {SITE_OWNER_NAME}. All rights reserved.
          </span>
        </div>
      </footer>
    </>
  );
}

export default App;
