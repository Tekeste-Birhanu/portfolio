import { Link } from "react-router-dom";
import { ProjectDetailSkeleton } from "./skeletons.jsx";

export function PageLayout({
  eyebrow,
  title,
  children,
  backToProjects = false,
  panel = false,
}) {
  return (
    <section className="page-section" aria-labelledby="page-title">
      {backToProjects && (
        <Link className="text-link project-back-link" to="/#projects">
          Back to Projects
        </Link>
      )}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className={panel ? "project-detail-panel" : undefined}>
        <h1 id="page-title">{title}</h1>
        {children}
      </div>
    </section>
  );
}

export function NotFoundPage({ project = false }) {
  return (
    <PageLayout
      eyebrow="404"
      title={project ? "Project not found" : "Page not found"}
    >
      <p className="page-intro">
        {project
          ? "This project may have been removed or the address may be incorrect."
          : "That address doesn’t match a page on this site."}
      </p>
      <Link className="text-link" to="/">
        Go to Home <span aria-hidden="true">→</span>
      </Link>
    </PageLayout>
  );
}

export function LoadingPage({ title = "Loading" }) {
  return (
    <PageLayout title={title} backToProjects panel>
      <ProjectDetailSkeleton />
    </PageLayout>
  );
}

export function ErrorPage({
  message = "Something went wrong. Please try again.",
  onRetry,
}) {
  return (
    <PageLayout eyebrow="Unable to continue" title="Something went wrong">
      <p className="page-intro" role="alert">
        {message}
      </p>
      {onRetry && (
        <button
          className="button button-secondary"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </PageLayout>
  );
}

export function ServiceUnavailablePage({
  message = "The portfolio service is unavailable. Please try again shortly.",
  onRetry,
}) {
  return (
    <PageLayout eyebrow="Temporary issue" title="Content can’t load right now">
      <p className="page-intro" role="alert">
        {message}
      </p>
      <button
        className="button button-secondary"
        type="button"
        onClick={onRetry ?? (() => window.location.reload())}
      >
        Retry
      </button>
    </PageLayout>
  );
}
