# ARCHITECTURE

## 1. Overview

- **Application:** Developer Portfolio (working title), a public portfolio site and a private single-administrator dashboard in one React app.
- **Architecture style:** Single-page application that talks directly to Supabase (managed Postgres, Auth, Storage). Row-level security in the database is the authorization boundary. One serverless function handles the contact form. There is no custom API server.
- **Deployment target:** Cloudflare Pages on a free pages.dev address, with automatic deploys from GitHub.
- **Key constraints:** Free tiers only; plain JavaScript; Supabase free-plan limits (1 GB file storage, pausing after inactivity); no custom domain; no server of our own.

## 2. Technology stack

- **Frontend:** React (Vite), plain JavaScript, plain CSS, React Router. Theme colors and fonts are CSS variables. dnd-kit is used for drag-and-drop ordering.
- **Backend:** One Supabase Edge Function for the contact form. Everything else is direct database access protected by security rules.
- **Database / storage:** Supabase Postgres and Supabase Storage. Free plan: 1 GB file storage. Bucket rules limit file types and sizes.
- **Authentication:** Supabase Auth with email/password and Google. Public sign-up is disabled; there is one designated administrator.
- **Email:** Brevo (free tier). Supabase Auth uses Brevo SMTP for administrator verification and password-reset emails; the contact Edge Function uses Brevo's API for message notifications. No CAPTCHA or application-level rate limiting is used for the contact form.
- **Hosting / deployment:** Cloudflare Pages; GitHub Actions for the keep-alive task. Pages needs a fallback rule so deep links work in a single-page app.
- **Testing:** Vitest. Basic tests for important logic only; no end-to-end tests.

## 3. System boundaries

```text
[Visitor / administrator browser] React app served by Cloudflare Pages
  |
  +-- Supabase JS client over HTTPS (anon key for visitors, signed-in session for the administrator)
  |     |
  |     +-- [Supabase] Postgres (row-level security), Auth, Storage
  |
  +-- Contact form -> [Edge Function: submit-contact]
          +-- Postgres (validate and save message)
          +-- Brevo API (notify configured contact email; visitor address is Reply-To)
          +-- Postgres (record notification result for Mailbox warning)

[Supabase Auth] -> Brevo SMTP (administrator verification and password-reset emails)

[GitHub Actions, daily] -> Supabase REST API (keep-alive requests)
```

## 4. Modules and responsibilities

- **Public site (`src/App.jsx`, `src/project-detail-page.jsx`, `src/public-page-states.jsx`):** Public home and route components, shared page states, and the separately loaded project detail gallery/lightbox. The hero copy and image are bundled with the app; dynamic project, About, Contact, and detail content reads through the Supabase client with the anon key. The public app never writes directly.
- **Admin app (`src/admin.jsx`, `src/admin/`):** Admin route composition, authentication provider, and page shell are separate from the public app. Login, Projects, About/Profile, and Contact/Mailbox screens live in focused components under `src/admin/`. Requires a signed-in administrator; all writes pass through database security rules.
- **Styles (`src/styles.css`, `src/admin.css`):** Shared theme tokens, base, and public styles live in `styles.css`; admin-only selectors live in `admin.css`.
- **Data layer (`src/lib`):** Supabase client, public and administrator query functions, slug helpers, upload validation helpers, profile/project media metadata handling, and public-content cache invalidation. The fixed hero, including its bundled profile image, makes no Supabase request. Projects, About, and Contact load independently near the viewport. Project cards request only rendered fields and one image; a project detail route loads its requested slug and associated project, technologies, and full gallery in one request.
- **Database rules (`supabase/migrations`):** Schema, constraints, security policies, storage bucket rules. The source of truth for who may read or write what.
- **Contact function (`supabase/functions/submit-contact`):** Validate and save visitor messages, send a Brevo notification, and record notification success or failure. The function reads Supabase's server credentials and the `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` secrets. The SMTP key used by Supabase Auth is separate from the Brevo API key. No CAPTCHA or application-level rate limiting.
- **Keep-alive workflow (`.github/workflows`):** Daily activity against Supabase. Uses only the public URL and anon key; no admin access.

## 5. Repository structure (when needed)

```text
/
  src/
    App.jsx            public routes and pages
    admin.jsx          admin route composition
    public-page-states.jsx shared page layout, loading, error, and not-found views
    styles.css         shared tokens, base, and public styles
    admin.css          admin-only styles
    admin/             admin screens and components
    lib/               Supabase client, data functions, helpers
    main.jsx           app entry point
  public/              static files, including the Pages fallback rule
  supabase/
    migrations/        schema, security rules, storage rules
    functions/
      submit-contact/
  .github/workflows/   keep-alive.yml
  docs/                project documents
  AGENTS.md
```

## 6. Key technical decisions

- **AD-01:** Single-page React app (Vite), not Next.js. Simpler to build and host as static files. Trade-off: weaker link previews than server-rendered pages.
- **AD-02:** The browser talks directly to Supabase; security rules are the authorization boundary. There is no custom API server. Hiding admin screens is never relied on for protection.
- **AD-03:** One designated administrator. The administrator's identity is stored in the database and checked by every write policy. Public sign-up is disabled, and a Google login alone never grants admin access.
- **AD-04:** Saving writes the live record. One row per content item and no draft tables, matching the PRD rule that saving makes content live.
- **AD-05:** The owner manually optimizes image files before upload. The app stores and serves each uploaded original without compression or generated image variants. GIFs are uploaded and served unchanged. Supabase Storage enforces allowed content types and file-size limits; database rules enforce per-project image caps and metadata requirements. Each file belongs to one item. For deletion, remove the associated Storage objects before deleting their database records; if Storage cleanup fails, retain the project record, report an error, and allow an idempotent retry. Do not report success until files and records are removed.
- **AD-06:** The contact form goes through an Edge Function only. Visitors cannot insert messages directly. The function validates and saves a message before attempting email, uses Brevo's API, records notification status, and keeps its service-role key and Brevo API key out of the browser. No CAPTCHA or application-level rate limiting is applied.
- **AD-07:** Keep-alive runs daily on GitHub Actions. It makes a few small reads and one small write through a restricted database function, and includes a stay-active step so GitHub does not disable the schedule after 60 days without commits. This lowers the risk of pausing but cannot guarantee it: Supabase can change its activity rules. Check the Actions tab monthly at first.
- **AD-08:** Slugs and redirects. Slugs are generated from the project name and kept unique. Old slugs are stored in a history table, and the app redirects from an old slug to the current one before showing a 404.
- **AD-09:** Routing and theme. React Router handles routes, with a Cloudflare Pages fallback so deep links load. The site uses a single dark theme; there is no theme toggle or saved theme preference.
- **AD-10:** Email delivery. Supabase Auth sends administrator verification and password-reset messages through Brevo SMTP. The contact Edge Function uses Brevo's API to notify the configured public contact email. If notification delivery fails after the message is saved, Mailbox shows a warning and retains the message.

## 7. Data and integration flow

- **Public read:** The browser requests content with the anon key. Security rules allow reading only public content tables and public storage files, and the page renders the result.
- **Administrator sign-in:** Supabase Auth issues a session stored in the current tab's `sessionStorage`; the app signs out after 10 minutes without activity. The app checks administrator status to decide what to show, and the database rules enforce it again on every request. Previously persistent local browser sessions are signed out and removed during the storage change.
- **Administrator save:** The app validates project fields and URLs for quick feedback. The designated-admin-only save RPC transactionally writes project fields, technology links, and slug history; it enforces required fields, allowed project status, and HTTP(S) URL schemes. The database enforces per-project image and GIF caps. No product-level text-length caps apply outside the contact form. The contact Edge Function limits visitor email to 254 characters and message to 5,000 characters. Images upload to Storage first (bucket rules limit file types and sizes), then the record is saved with the image references.
- **Delete:** Remove the project's Storage objects before deleting its database records. If any file removal fails, keep the project record, show an error, and allow retry; retry operations safely handle already-removed objects. Report success only after all associated files and database records are removed.
- **Contact submit:** The browser sends the visitor email and message to the Edge Function. The function reads at most 24 KiB of JSON, validates the visitor email (up to 254 characters) and message (up to 5,000 characters), saves the message, looks up the configured Email contact method, and then attempts a Brevo notification with the visitor's address as Reply-To. It records whether notification succeeded. The visitor sees success after saving even if email delivery fails; Mailbox displays a warning for a failed notification.
- **Keep-alive:** A daily workflow sends a few requests to Supabase so the project keeps registering activity.

See `SCHEMA.md` for tables and `APP_FLOW.md` for user journeys.

## 8. Cross-cutting requirements

- **Authentication and authorization:** Identity comes from Supabase Auth. Access is enforced in the database for every admin read and write, never only in the interface.
- **Validation and data integrity:** Interface checks are for convenience. Database constraints, a project-media trigger that checks actual uploaded object metadata and project limits, and Storage bucket size/type rules are the real media validation. The contact function re-validates everything it receives.
- **Errors and logging:** Errors shown to users say what failed and what to do next. Secrets, tokens, and message contents are never logged.
- **Configuration and secrets:** The Supabase URL and anon key are public by design and live in build-time variables. `VITE_SITE_URL` optionally sets the public Auth callback origin; production sets it to the deployed site origin, while local development can leave it empty to use the current origin. Brevo SMTP credentials are configured in Supabase Auth; the service-role key and Brevo API key exist only as Edge Function secrets, never in the repository or browser.
- **Performance and caching:** Admin and project-detail code are separate lazy-loaded bundles. The hero reads its local cache immediately and fetches fresh content; below-the-fold Home content loads as it approaches the viewport. Public project cards request only summary fields and image metadata used to select the main image; full project content is fetched only on its detail route. Project list and gallery images use lazy loading where appropriate. Successfully loaded public content is cached in browser local storage and rendered immediately on later visits while Supabase refreshes it; overlapping requests are deduplicated, and admin saves in the same browser invalidate this cache. This cache contains public content only and may be briefly stale after edits from another device.
- **Background work and external services:** There are no background queues or automatic retries. A project media cleanup table records failed Storage removals for the administrator to retry manually. Email notification failure does not lose the saved message and is recorded for a warning in Mailbox. Contact submissions do not use CAPTCHA or application-level rate limiting.
