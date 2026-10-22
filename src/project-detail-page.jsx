import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getPublicProjectBySlug } from "./lib/public-content.js";
import {
  LoadingPage,
  NotFoundPage,
  PageLayout,
  ServiceUnavailablePage,
} from "./public-page-states.jsx";
export default function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    setProject(null);
    setNotFound(false);
    setError(false);
    getPublicProjectBySlug(slug)
      .then((match) => {
        if (!current) return;
        setProject(match ?? null);
        setNotFound(!match);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [slug]);

  if (error)
    return (
      <ServiceUnavailablePage message="The project could not be loaded. Please try again shortly." />
    );
  if (notFound) return <NotFoundPage project />;
  if (!project) return <LoadingPage title="Loading project" />;
  if (project.slug !== slug)
    return <Navigate to={`/projects/${project.slug}`} replace />;
  return (
    <PageLayout title={project.name} backToProjects panel>
      <p className="status-tag detail-status">
        {project.status === "planning"
          ? "Planning"
          : project.status === "in_progress"
            ? "In progress"
            : "Completed"}
      </p>
      <div
        className={`detail-summary-grid${project.technologies.length > 0 ? " has-technologies" : ""}`}
      >
        <p className="page-intro">{project.shortDescription}</p>
        {project.technologies.length > 0 && (
          <div className="detail-block detail-technologies">
            <h2>Technologies</h2>
            <ul className="technology-list">
              {project.technologies.map((item) => (
                <li className="technology-tag" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <ProjectGallery project={project} />
      {(project.repositoryUrl || project.liveDemoUrl) && (
        <div className="project-actions detail-actions">
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
        </div>
      )}
      {project.keyFeatures?.trim() && (
        <div className="detail-block">
          <h2>Key features</h2>
          <ul className="detail-key-features">
            {project.keyFeatures
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
          </ul>
        </div>
      )}
      <Link
        className="text-link project-back-link project-back-bottom"
        to="/#projects"
      >
        Back to Projects
      </Link>
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
    setLightboxIndex(
      (index) => (index + direction + images.length) % images.length,
    );
  };

  return (
    <div
      className="project-gallery"
      role="group"
      aria-label={`${project.name} screenshots`}
    >
      <button
        className="gallery-main-button"
        type="button"
        onClick={openLightbox}
        aria-label={`Open image viewer: ${images[selected].alt_text}`}
      >
        <img
          className="detail-image"
          src={images[selected].url}
          alt={images[selected].alt_text}
          fetchPriority="high"
          decoding="async"
        />
      </button>
      {images.length > 1 && (
        <div
          className="gallery-thumbnails"
          role="group"
          aria-label="Choose project image"
        >
          {images.map((image, index) => (
            <button
              className={`gallery-thumbnail${index === selected ? " is-selected" : ""}`}
              type="button"
              key={image.id}
              onClick={() => setSelected(index)}
              aria-label={`Show image ${index + 1}: ${image.alt_text}`}
              aria-pressed={index === selected}
            >
              <img
                src={image.url}
                alt=""
                loading={index === selected ? "eager" : "lazy"}
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}
      <dialog
        className="lightbox"
        ref={dialogRef}
        aria-label={`${project.name} image viewer`}
        onCancel={() => setLightboxIndex(null)}
        onClose={() => {
          setLightboxIndex(null);
          requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" && images.length > 1) {
            event.preventDefault();
            move(-1);
          }
          if (event.key === "ArrowRight" && images.length > 1) {
            event.preventDefault();
            move(1);
          }
        }}
        onTouchStart={(event) => {
          touchStartRef.current = {
            x: event.changedTouches[0].clientX,
            y: event.changedTouches[0].clientY,
          };
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          if (!start || images.length < 2) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy))
            move(dx < 0 ? 1 : -1);
          touchStartRef.current = null;
        }}
      >
        <div className="lightbox-toolbar">
          <span aria-live="polite">
            Image {activeIndex + 1} of {images.length}
          </span>
          <button
            className="button button-secondary"
            ref={closeRef}
            type="button"
            onClick={closeLightbox}
          >
            Close image viewer
          </button>
        </div>
        {images.length > 1 && (
          <button
            className="lightbox-nav lightbox-previous"
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous image"
          >
            ‹
          </button>
        )}
        <img
          className="lightbox-image"
          src={images[activeIndex].url}
          alt={images[activeIndex].alt_text}
        />
        {images.length > 1 && (
          <button
            className="lightbox-nav lightbox-next"
            type="button"
            onClick={() => move(1)}
            aria-label="Next image"
          >
            ›
          </button>
        )}
      </dialog>
    </div>
  );
}
