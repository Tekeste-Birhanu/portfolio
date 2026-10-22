function Bar({ className = "", width = "100%", height = "1rem" }) {
  return (
    <span
      className={`ui-skeleton ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

function LoadingStatus({ label, children, className = "" }) {
  return (
    <div className={`content-skeleton-status ${className}`} role="status" aria-label={label}>
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <LoadingStatus label="Loading project details" className="project-detail-skeleton">
      <Bar className="status-tag detail-status skeleton-detail-status" width="6rem" height="1.75rem" />
      <div className="detail-summary-grid has-technologies skeleton-detail-summary">
        <div className="skeleton-stack">
          <Bar height="1rem" />
          <Bar width="82%" height="1rem" />
        </div>
        <div className="skeleton-detail-technologies">
          <Bar width="42%" height="1.4rem" />
          <ul className="technology-list" aria-hidden="true">
            {[0, 1, 2].map((item) => <li className="technology-tag" key={item}><Bar width={`${4 + item}rem`} height="1.5rem" /></li>)}
          </ul>
        </div>
      </div>
      <div className="project-gallery skeleton-project-gallery">
        <Bar className="detail-image skeleton-detail-image" height="auto" />
        <div className="gallery-thumbnails" aria-hidden="true">
          {[0, 1, 2].map((item) => <Bar className="gallery-thumbnail skeleton-thumbnail" width="6rem" height="4rem" key={item} />)}
        </div>
      </div>
      <div className="project-actions skeleton-detail-actions" aria-hidden="true">
        <Bar width="6rem" height="2.75rem" />
        <Bar width="6rem" height="2.75rem" />
      </div>
      <div className="detail-block skeleton-detail-copy">
        <Bar width="34%" height="1.4rem" />
        <div className="skeleton-stack">
          <Bar height="1rem" />
          <Bar width="88%" height="1rem" />
          <Bar width="74%" height="1rem" />
        </div>
      </div>
    </LoadingStatus>
  );
}

export function PublicProjectsSkeleton() {
  return (
    <LoadingStatus label="Loading projects" className="public-project-skeletons">
      <div className="project-list project-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <article className="project-entry" key={index}>
            <Bar className="project-image skeleton-project-image" height="auto" />
            <div className="project-copy skeleton-project-copy">
              <div className="project-heading">
                <Bar width="52%" height="1.4rem" />
                <Bar width="5rem" height="1.5rem" />
              </div>
              <div className="skeleton-stack skeleton-project-description">
                <Bar width="86%" />
                <Bar width="70%" />
              </div>
              <ul className="technology-list" aria-hidden="true">
                {[0, 1, 2].map((item) => <li className="technology-tag" key={item}><Bar width={`${4 + item}rem`} height="1.5rem" /></li>)}
              </ul>
              <div className="project-actions skeleton-project-actions" aria-hidden="true">
                <Bar width="5rem" height="2.75rem" />
                <Bar width="5rem" height="2.75rem" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </LoadingStatus>
  );
}

export function PublicAboutSkeleton() {
  return (
    <LoadingStatus label="Loading About Me" className="public-about-skeleton">
      <div className="skeleton-stack skeleton-about-intro">
        <Bar width="82%" height="1.4rem" />
        <Bar width="91%" height="1.4rem" />
        <Bar width="63%" height="1.4rem" />
      </div>
      <div className="skeleton-about-details">
        <div className="skeleton-about-skills">
          <Bar width="8rem" height="1.6rem" />
          <div className="skeleton-about-categories">
            {[0, 1].map((item) => (
              <div className="skeleton-stack" key={item}>
                <Bar width="45%" height="1.4rem" />
                <Bar width="58%" />
                <Bar width="72%" />
                <Bar width="46%" />
              </div>
            ))}
          </div>
        </div>
        <div className="skeleton-about-experience">
          <Bar width="9rem" height="1.6rem" />
          <div className="skeleton-stack">
            <Bar width="42%" height="1.2rem" />
            <Bar width="32%" height="0.9rem" />
            <Bar width="82%" />
            <Bar width="64%" />
          </div>
        </div>
      </div>
    </LoadingStatus>
  );
}

export function PublicContactSkeleton() {
  return (
    <LoadingStatus label="Loading contact details" className="public-contact-skeleton">
      {[0, 1, 2].map((item) => (
        <div className="skeleton-contact-row" key={item}>
          <Bar className="skeleton-contact-icon" width="2.75rem" height="2.75rem" />
          <div className="skeleton-contact-copy">
            <Bar width={item === 0 ? "5rem" : "6rem"} height="1rem" />
            <Bar width={item === 0 ? "12rem" : "9rem"} height="1rem" />
          </div>
        </div>
      ))}
    </LoadingStatus>
  );
}

export function AdminProjectsSkeleton() {
  return (
    <LoadingStatus label="Loading projects" className="admin-project-skeletons">
      <ul className="admin-project-list" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <li className="admin-project-row" key={index}>
            <Bar className="skeleton-drag-handle" width="2.75rem" height="2.75rem" />
            <div className="admin-project-main skeleton-stack">
              <Bar width="66%" height="1rem" />
              <Bar width="38%" height="0.8rem" />
            </div>
            <div className="admin-row-actions">
              <Bar width="4.5rem" height="2.5rem" />
              <Bar width="4.5rem" height="2.5rem" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingStatus>
  );
}

export function AdminProfileSkeleton() {
  return (
    <LoadingStatus label="Loading profile" className="admin-profile-skeletons">
      <div className="admin-profile-section skeleton-stack">
        <Bar width="28%" height="1.4rem" />
        <Bar height="5rem" />
      </div>
      <div className="admin-profile-section skeleton-stack">
        <Bar width="22%" height="1.4rem" />
        <Bar height="4rem" />
        <Bar height="4rem" />
      </div>
      <div className="admin-profile-section skeleton-stack">
        <Bar width="18%" height="1.4rem" />
        <Bar height="5rem" />
      </div>
    </LoadingStatus>
  );
}

export function AdminMailboxSkeleton() {
  return (
    <LoadingStatus label="Loading mailbox" className="admin-mailbox-skeletons">
      {[0, 1].map((section) => (
        <section className="admin-profile-section skeleton-stack" key={section}>
          <Bar width="32%" height="1.4rem" />
          {Array.from({ length: section === 0 ? 3 : 2 }, (_, index) => (
            <div className="skeleton-admin-row" key={index}>
              <Bar width="58%" />
              <Bar width="32%" />
            </div>
          ))}
        </section>
      ))}
    </LoadingStatus>
  );
}

export function AdminEditorSkeleton({ label = "Loading project editor" }) {
  return (
    <LoadingStatus label={label} className="admin-editor-skeleton">
      <div className="skeleton-editor-primary skeleton-stack">
        <Bar width="45%" height="1rem" />
        <Bar height="2.75rem" />
        <Bar width="55%" height="1rem" />
        <Bar height="6rem" />
        <Bar width="50%" height="1rem" />
        <Bar height="6rem" />
      </div>
      <div className="skeleton-stack">
        <Bar width="42%" height="1.25rem" />
        <Bar height="9rem" />
        <Bar width="36%" height="1.25rem" />
        <Bar height="5rem" />
      </div>
    </LoadingStatus>
  );
}

export function AdminMediaSkeleton() {
  return (
    <LoadingStatus label="Loading project media" className="admin-media-skeletons">
      {[0, 1].map((item) => (
        <div className="skeleton-admin-media-row" key={item}>
          <Bar width="8rem" height="6rem" />
          <div className="skeleton-stack">
            <Bar width="38%" />
            <Bar height="2.5rem" />
            <Bar width="62%" height="2.5rem" />
          </div>
        </div>
      ))}
    </LoadingStatus>
  );
}

export function AdminMessageSkeleton() {
  return (
    <LoadingStatus label="Loading message" className="admin-message-skeleton">
      <div className="admin-profile-section skeleton-stack">
        <Bar width="40%" />
        <Bar width="24%" height="0.8rem" />
        <Bar height="8rem" />
      </div>
    </LoadingStatus>
  );
}
