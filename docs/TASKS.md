# Implementation Tasks

## 1. How to use this plan

- Tasks are sized as self-contained feature slices for an AI coding agent: one clear outcome, a bounded scope, explicit dependencies, and observable completion criteria. They are not meant to prescribe tiny code modules.
- Assign one task at a time. The agent should inspect the repository and linked specifications before editing, follow existing patterns, and avoid unrelated changes.
- If a dependency is incomplete or a consequential decision is unclear, stop that task and report the blocker. Do not invent product behavior.
- Each task should leave the app in a coherent state. Include the relevant tests or checks with the feature when the project supports them; run the documented verification before marking `Done`.
- Report changed files, checks run and their results, and any remaining risks. Update this file and source specifications when an approved decision changes.
- Keep credentials in deployment secrets or local environment files; never commit real credentials.

## 2. Status and priority

- **Status:** `Not started` / `In progress` / `Blocked` / `Done`
- **Priority:** `Must` / `Should`
- **Task IDs:** Stable IDs link work to requirements such as `F-01` and journeys such as `J-01`.

## 3. Milestones

- **M1 — Specification and foundation:** Resolve specification gaps, define the data model, and prepare the application and services.
- **M2 — Public portfolio:** Deliver the visitor-facing portfolio and its content features.
- **M3 — Admin and contact workflows:** Deliver secure content management, Mailbox, and contact delivery.
- **M4 — Launch readiness:** Verify quality requirements and deploy the free-tier application.

## 4. Task backlog

### M1 — Specification and foundation

#### T-01 — Finalize schema and align specifications

- **Status:** Done
- **Priority:** Must
- **Depends on:** None
- **Related:** F-01–F-06, F-08–F-19; J-01–J-06
- **Goal:** Make the product and data decisions complete and consistent enough that implementation agents do not need to guess.
- **Scope:** Complete the `SCHEMA.md` draft with entities, relationships, constraints, indexes, RLS/storage rules, deletion behavior, migrations, and seed approach. Align PRD, App Flow, Architecture, and Design with approved decisions: the designated administrator can sign in with email/password or Google; Supabase Auth uses Brevo for email verification and password recovery; public registration is disabled and Google sign-in alone does not grant admin access; any contact platform is allowed with a generic icon fallback; exactly one non-removable Email contact method is the public and notification address; all saved projects have public detail routes and appear in the Projects section in shared administrator order; project deletion is permanent with no archive state; no CAPTCHA or app-level rate limiting; original uploads are served without app compression; no product-level text-length caps apply outside contact-form limits.
- **Done when:**
  - [x] The schema covers public content, admin data, messages, notification status, files, and project URL history.
  - [x] The specifications agree that Google sign-in is an admin option only, and agree on authorization, contact, uploads, and deletion rules.
  - [x] Definition of Ready reflects the current state and remaining launch-time items.
- **Verify:** Cross-checked requirements and invariants against PRD, App Flow, Architecture, Design, and Schema.
- **Notes:** No unresolved product-level schema questions remain. Field-length caps are defined only for the visitor contact form.

#### T-02 — Bootstrap the app and service configuration

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-01
- **Related:** F-08; Architecture AD-01–AD-10
- **Goal:** Establish a runnable React/Vite plain-JavaScript application and safe local/deployment configuration.
- **Scope:** Create the app shell, Supabase project configuration and migration workflow, Cloudflare Pages setup with SPA fallback, environment examples, and documented local commands. Keep credentials and server-only settings out of browser code.
- **Done when:**
  - [x] The app runs locally and builds for Cloudflare Pages using documented commands.
  - [x] Supabase migrations can be applied from the repository and public settings are separated from secrets.
  - [x] Nested routes load directly and no real credentials are committed.
- **Verify:** `npm.cmd ci`, `npm.cmd run dev`, and `npm.cmd run build` passed. CLI authentication and project linking succeeded; `npm.cmd run db:push -- --dry-run` connected to the remote database and reported it was up to date. Secret-pattern scan found no credential values in project files. Direct nested-route response and built Cloudflare fallback were checked.
- **Notes:** Hosted Supabase migrations are used; Docker is not required. The first schema migration was created with T-04 and applied to the linked hosted project after review. See T-04 for the migration result.

### M2 — Public portfolio

#### T-03 — Implement public layout and routes

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-02
- **Related:** F-01, F-02, F-05
- **Goal:** Create the responsive single-page public shell on which portfolio features can be built.
- **Scope:** Implement the single dark theme, navigation to Home, Projects, About, and Contact sections, separate project detail routes, plus loading, error, empty, unavailable-service, and not-found states. Existing `/projects`, `/about`, and `/contact` paths should land on their corresponding sections.
- **Done when:**
  - [x] Public sections load directly by hash and navigation scrolls correctly at phone, tablet, and desktop widths.
  - [x] Unknown and deleted project routes can show a not-found page with a link Home.
  - [x] Basic keyboard navigation and visible focus work in the shell.
- **Verify:** Open every route directly and through navigation; check 320px, tablet, and desktop layouts.
- **Progress:** Single-page public shell with hash navigation, route placeholders, empty/unavailable/loading/error/not-found states, responsive navigation styles, skip link, and visible focus styles are implemented. Legacy `/projects`, `/about`, and `/contact` paths redirect to the relevant section; project detail URLs remain separate. Interactive browser checks at the required widths remain to be completed because no browser surface is available in this session. The owner later confirmed the remaining checks were complete.

#### T-04 — Render Home and Projects lists

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-01, T-03
- **Related:** F-01, F-02, F-13; J-01
- **Goal:** Let visitors read the introduction, browse all projects, and review skills under About Me.
- **Scope:** Home contains the name, fixed hero role and intro, and bundled profile image; Projects lists all saved projects in shared administrator-defined order using two columns on wide screens and one on narrow screens; About shows categorized skills. Projects, About, and Contact load independently near the viewport. There is no Browse projects action or expand control. Each listed project links to a separate detail view. Add clear visual dividers between the Home, Projects, About, and Contact sections.
- **Done when:**
  - [x] Project entries show name, description, technologies, status, available links, image, and detail link.
  - [x] Home contains the fixed owner name, role, intro, bundled profile image, and fixed contact/GitHub actions; the Projects section lists all projects in stored order without a featured toggle, Browse action, or expand control; the list uses two columns on wide screens and one on narrow screens.
  - [x] Projects navigation reaches the project list, and every project has a "View details" link to its separate route.
  - [x] Skills appear under About, empty categories are omitted, and the project empty state appears when no projects exist.
  - [x] Public section boundaries are visually clear.
- **Verify:** Check multiple ordered projects, all saved projects appearing on Projects, separate detail links, optional links, responsive columns, skills under About with multiple categories and their order, empty categories, no-project state, and visible section dividers.
- **Progress:** Added the public content data module, project list, skills display, and public schema/storage migration. The migration is applied and the production build passes. The owner confirmed the public project list and skills, including that all saved projects use the shared administrator-defined order.

#### T-05 — Render project detail, gallery, and URL history

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-04
- **Related:** F-02, F-03, F-04, F-12; J-01
- **Goal:** Let visitors inspect a project and its media, including old project links after a rename.
- **Scope:** Render project details and optional sections in fixed order; implement gallery/lightbox; support unique slugs, redirects after rename, and 404 for deleted projects.
- **Done when:**
  - [x] Empty optional sections are omitted; populated sections appear in the required order.
  - [x] Gallery supports one or many images, keyboard controls, touch navigation, and focus return after close.
  - [x] Old slugs redirect to the current project; deleted slugs show not found.
- **Verify:** Check empty sections, single/multiple images, keyboard/touch controls, rename history, and deleted slugs.
- **Progress:** Implemented project detail field mapping and fixed-order optional sections, the single/multiple image gallery and native lightbox, and redirects from historical slugs. The owner confirmed project details, media, and URL behavior during the editor walkthrough; automated tests and the production build pass.

#### T-06 — Render About and profile content

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-01, T-03
- **Related:** F-05, F-15; J-02
- **Goal:** Present the owner's background and optional CV.
- **Scope:** Render the About Me intro, experience, and CV from stored content, and render the bundled profile image in the Home hero. Render intro, experience, and categorized skill bullet lists only when populated; omit empty categories. Education is not part of the public portfolio.
- **Done when:**
  - [x] Sections without content are omitted and the CV link appears only when a CV exists.
  - [x] CV opens as a browser PDF preview and the page adapts to phone and desktop.
- **Verify:** Check partial and complete profiles, with and without a CV; the Home image is a bundled asset and is not profile content fetched from Supabase.
- **Progress:** Added public profile and experience data reads, conditional About Me rendering, and the additive schema/storage migration. Education was later removed from the application; its legacy table is retained with access revoked. The migration was applied to the linked Supabase project. The owner confirmed the profile behavior; automated tests and the production build pass.

### M3 — Admin and contact workflows

#### T-07 — Implement administrator sign-in and authorization

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-01, T-02
- **Related:** F-08; J-03
- **Goal:** Allow only the designated owner to use admin features.
- **Scope:** Implement email/password and Google sign-in for the designated administrator, email verification and password recovery through Supabase Auth/Brevo, session handling, protected routes, and database-enforced authorization. Disable public registration.
- **Done when:**
  - [x] The provisioned admin can sign in, verify the account, recover a password, and sign out.
  - [x] Unauthenticated users and non-designated accounts cannot access admin data or actions.
  - [x] No public sign-up is available; Google sign-in grants access only to the designated administrator account.
  - [x] The session is stored for the current tab and the app signs out after 10 minutes without activity.
- **Verify:** Check sign-in, verification, recovery, expiration, sign-out, and denied access using a non-admin account.
- **Progress:** Added email/password and Google sign-in screens, password recovery/update, session checks against the designated-admin RPC, protected admin routes, and database/Storage authorization policies. The authorization migration is applied. Hosted Auth providers and redirect URLs are configured, the designated user is provisioned in `admin_config`, and the user reached the authorized admin page. Brevo SMTP delivery succeeded after authorizing the blocked SMTP source IP; password recovery completed, and replaying a used link returned `otp_expired`. Fixed the sign-in page's duplicate success notice and the recovery route's mistaken reliance on any admin session; it now requires Supabase's `PASSWORD_RECOVERY` event and handles invalid/expired-link redirects. The user confirmed the sign-in, recovery, sign-out, Google, expired-link, and denied-access checks. Updated the client to store auth sessions per tab and sign out after 10 minutes without activity; browser verification of the new session behavior is pending. The owner later confirmed the remaining checks were complete.

#### T-08 — Build admin navigation and Projects list

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-07
- **Related:** F-09, F-13; J-03
- **Goal:** Give the administrator a responsive home for project management.
- **Scope:** Implement responsive sidebar navigation and a two-column Projects dashboard landing page with search, last-updated information, add/edit entry points, and pointer-based drag ordering. Project order is also the public Projects section order; there is no featured toggle.
- **Done when:**
  - [x] The list shows project name, last updated, and actions; search filters by name.
  - [x] All saved projects appear in the public Projects section in the same order as the admin list.
  - [x] Project order can be changed by dragging.
  - [x] Admin navigation adapts to desktop and mobile.
- **Verify:** Check filtering, ordering, empty state, responsive layout, and authorization.
- **Progress:** Added protected responsive sidebar navigation, a Supabase-backed two-column Projects dashboard with search, last-updated dates, add/edit entry points, and drag ordering. Removed the featured toggle; the complete admin list order drives the public list. A database migration drops the unused featured flag. Below 1024px, the admin navigation opens as an accessible side drawer. The owner confirmed the dashboard behavior and responsive navigation; the production build passes.

#### T-09 — Implement project editor and permanent deletion

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-08
- **Related:** F-10, F-12, F-14; J-03, J-06
- **Goal:** Let the administrator create, edit, and permanently delete projects.
- **Scope:** Implement explicit-save project editing, required fields, a technology multi-select populated from technologies already used by projects, an option to create and select a new reusable technology, status, links, optional detail fields, unique slug generation/history, unsaved-change guard, and named delete confirmation.
- **Done when:**
  - [x] First save requires name, short description, and status; successful edits become live immediately.
  - [x] Existing technologies can be selected; a newly created technology is attached to the current project and appears as an option for later projects.
  - [x] Leaving with unsaved edits offers Stay or Leave and discard.
  - [x] Rename preserves redirects; the user verified the old URL redirects to the current project.
  - [x] Confirmed deletion removes the project and its public URL returns not found.
  - [x] Storage cleanup failure retains the project and supports a safe retry; verify with uploaded media during T-10.
- **Verify:** Check create/edit validation, existing and newly created reusable technologies, URLs, unsaved changes, and confirmed deletion.

- **Progress:** Implemented the project editor, required-field and URL validation, reusable technology selection/creation, explicit save, a transactional save RPC for project fields/technologies/slug history, unsaved-navigation protection, and named permanent deletion with retryable Storage cleanup. The production build passes and the hosted save RPC is applied. The user verified save/public listing after refresh, project details, existing and reusable new technologies, both unsaved-change choices, rename redirects, and deletion/not-found behavior. Storage cleanup retry with uploaded media remains to be verified after T-10 media management is available. The owner later confirmed the remaining checks were complete.

#### T-10 — Implement project media management

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-09
- **Related:** F-04, F-11, F-14; J-03, J-06
- **Goal:** Let the administrator manage project screenshots and GIFs safely.
- **Scope:** Add original JPG/PNG/WebP/GIF uploads, limits, alt text, main-image selection, ordering, replacement, removal, and storage cleanup. Do not generate compressed or resized variants.
- **Done when:**
  - [x] Server-side rules enforce file types/sizes and limits of 10 still images and 2 GIFs per project.
  - [x] Every image has alt text; main image and gallery order can be changed.
  - [x] Originals are served as uploaded; removed files and deleted-project media are removed from storage, with a retryable error and no false success if cleanup fails.
- **Verify:** Check accepted/rejected uploads, size/count limits, replacements, ordering, public display, and cleanup.
- **Notes:** JPG/PNG/WebP limit is 5 MB; GIF limit is 10 MB. The owner manually optimizes images.
- **Progress:** Added the project editor's media manager for original image/GIF uploads, required alt text, replacement/removal, main-image choice, ordering, and retryable cleanup. The migration validates actual Storage object MIME/size metadata, serializes project count checks, caps stills/GIFs, and records cleanup retries. The user verified T-10, and the database dry run reported no pending migrations. The owner later confirmed the remaining checks were complete.

#### T-11 — Implement Profile and skills editing

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-07, T-01
- **Related:** F-05, F-15; J-04
- **Goal:** Let the owner maintain About Me content and skills without code changes.
- **Scope:** Build explicit-save editors for the About Me intro, experience (including optional free-form date ranges), PDF CV, skill categories, and their skills. Education is not managed in the dashboard. The profile image is bundled with the app, not managed from the dashboard.
- **Done when:**
  - [x] Profile content saves and appears on About; empty sections and categories are omitted publicly.
  - [x] Categories can be added, renamed with one Save skills action, and reordered by dragging; a category can be removed only when empty.
  - [x] Skills can be added, renamed with the shared Save skills action, reordered within a category, moved between categories by dragging, and removed; About groups skills in bullet lists under category names and omits empty categories.
  - [x] CV accepts PDF up to 10 MB and can be replaced or removed.
- **Verify:** Check validation, media handling, category and skill operations, drag reordering for categories and skills, moving skills between category columns by dragging, that non-empty categories cannot be deleted, empty-state behavior, and public updates.
- **Progress:** Replaced the Profile placeholder with editors for the About Me introduction, experience, CV, skill categories, and skills. Education has been removed from the administrator and public interfaces; its legacy database table is retained without an application read/write path to avoid deleting existing records. The Home image is bundled with the app rather than managed from the dashboard. Added browser-side file type/size checks, retryable CV cleanup, and a database trigger that prevents deleting a category with skills. Migration `20261017000006_profile_editor_rules.sql` is confirmed in both local and remote migration history; the owner confirmed the interactive checks were complete.

#### T-12 — Keep Home content fixed and bundled

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-07, T-01
- **Related:** F-01, F-16; J-04
- **Goal:** Keep the Home role, introduction, image, and actions fixed in the app.
- **Scope:** Bundle the Home image in `public/`; keep hero text, actions, page structure, and section order fixed in the app. The admin dashboard has Projects, About, and Contact sections only.
- **Done when:**
  - [x] The bundled profile image and fixed hero text render without a Supabase content request.
  - [x] Homepage sections and their order are fixed in the application.
  - [x] The role and approved introduction are fixed in the app; the fixed hero actions use their defined contact and GitHub destinations.
- **Progress:** Home role, approved intro, image, actions, page sections, and section order are fixed in the app. The profile image is served from `public/profile-placeholder.jpg`; there is no Supabase read or admin photo editor. The legacy `profile_content.photo_storage_path` column, photo bucket, and historical cleanup rows remain in the hosted schema to avoid deleting stored data; the app no longer reads or writes the photo path. The legacy `homepage_content` table remains unused. The owner confirmed the interactive checks were complete.
- **Verify:** Check the fixed Home content and bundled image render without a Supabase request, fixed section order, and responsive layout.

#### T-13 — Implement Mailbox and contact methods

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-07, T-01
- **Related:** F-17, F-18; J-04, J-05
- **Goal:** Let the owner manage visitor messages and public contact links.
- **Scope:** Build newest-first Mailbox list/detail, mark messages read automatically when opened, confirmed deletion, plus contact-method add/edit/enable/disable/reorder/remove. Link methods select a built-in icon; Phone methods accept a phone number and open the device dialer.
- **Done when:**
  - [x] Messages show visitor email, message, date, and notification status; opening marks read.
  - [x] Exactly one Email method exists, is editable but cannot be disabled or removed, and is separate from login email.
  - [x] Other methods can be managed; enabled methods appear publicly in order.
- **Verify:** Check automatic read state on open, confirmed deletion, contact-method operations, Email invariant, public order, and authorization.
- **Progress:** Added the messages list and detail route, automatic read state on open, confirmed deletion, notification status display, contact-method editor with drag ordering, a database-seeded required Email row protected by database constraints, and public rendering for enabled contact methods. The owner applied migrations `20261017000008_mailbox_and_contact_methods.sql` and `20261017000009_contact_method_icons.sql`, confirmed the Contact dashboard and public links work, and completed the message and method walkthroughs.

#### T-14 — Implement contact form and Brevo notification

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-13
- **Related:** F-06, F-17–F-19; J-02, J-05
- **Goal:** Save visitor messages reliably and notify the configured contact email.
- **Scope:** Implement visitor email/message form and trusted Supabase Edge Function validation (email up to 254 characters; message up to 5,000), persistence, and Brevo notification with visitor email as Reply-To. Keep secrets server-side. Do not add CAPTCHA or application-level rate limiting.
- **Done when:**
  - [x] Invalid input is rejected server-side and text remains available for correction or retry.
  - [x] Message is saved before email is attempted; visitor sees success after save even if notification fails.
  - [x] Notification failure is recorded and shown in both Mailbox list and detail; save failure shows configured contact email as an alternative.
- **Verify:** Check validation, save/delivery success, notification failure after save, save failure, and secret boundaries.
- **Progress:** Implemented and deployed the public Contact form and Supabase Edge Function with server-side validation, save-before-notify behavior, Brevo delivery with visitor Reply-To, and notification-status recording. The administrator configured the Edge Function secrets and confirmed the success and failure paths. The existing SMTP key is not used for the Brevo API. The owner later confirmed the remaining checks were complete.

### M4 — Launch readiness

#### T-15 — Complete accessibility and responsive checks

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-05, T-06, T-08–T-14
- **Related:** Quality requirements; F-04, F-06
- **Goal:** Bring implemented public and admin workflows in line with the agreed design and accessibility requirements.
- **Scope:** Check and fix keyboard use, focus, labels, dialogs/lightbox, responsive layouts, contrast, touch targets, reduced motion, and zoom/reflow.
- **Done when:**
  - [x] Core routes and workflows work by keyboard and fit 320px through desktop layouts.
  - [x] Dialogs and lightbox manage focus; errors and controls have accessible names and states.
  - [x] Documented contrast, reduced-motion, touch-target, and zoom requirements are met.
- **Verify:** Run configured accessibility checks and conduct documented keyboard and viewport walkthroughs.
- **Progress:** Code review confirms keyboard reordering and spoken position feedback for Projects, experience, categories/skills, and contact methods; field-associated validation errors; accessible gallery names and controls; visible focus styling; 44px interactive controls; and reduced-motion support. Updated dark-theme contrast ratios are: body text 15.55:1, muted text 8.82:1, accent links 6.46:1, dark text on accent buttons 5.75:1, and control boundaries 4.24:1 against the surface. Automated tests (5 passed) and the production build passed. The owner completed the browser-based keyboard, touch, 200% zoom, reduced-motion, and 320px/tablet/desktop walkthroughs.

#### T-16 — Review security and failure recovery

- **Status:** Done
- **Priority:** Must
- **Depends on:** T-07, T-09–T-14
- **Related:** Security and reliability requirements; F-06, F-08, F-11, F-14, F-18, F-19
- **Goal:** Verify trusted boundaries, authorization, and recovery behavior across implemented features.
- **Scope:** Review RLS/storage rules, server-side validation, file constraints, plain-text rendering, secret handling, service-outage states, and message-save/notification failure behavior; fix confirmed defects.
- **Done when:**
  - [x] Admin/private data and writes are protected by backend policies, not UI-only checks.
  - [x] Inputs/files are validated at trusted boundaries and user text is not rendered as HTML.
  - [x] Failed notification does not lose a message; documented loading, empty, error, and retry states work.
- **Verify:** Run configured security checks and targeted authorization and failure-path scenarios; record outcomes.
- **Progress:** Reviewed database and Storage policies, grants, privileged RPCs, public contact-function boundaries, file bucket constraints, and UI rendering. Admin access is enforced by `is_designated_admin()` in RLS/Storage policies and checked by privileged RPCs; public message inserts are revoked and the Edge Function uses server-only secrets. JSX renders editable and visitor-provided text as text; no `dangerouslySetInnerHTML` or `innerHTML` use was found. Added a 24 KiB streaming request-body limit to the contact function while retaining server-side email/message character validation. Unit tests cover malformed JSON, invalid UTF-8, oversized streamed bodies, the 254-character email and 5,000-character message limits, and multi-byte Unicode. Existing user-confirmed T-07/T-14 walkthroughs cover denied non-admin access and message persistence when notification fails; code review confirmed loading, empty, error, and retry states. `npm.cmd test` (12 tests) and `npm.cmd run build` pass. The new request-size guard is source-verified and will be exercised against the deployed function during T-17.

#### T-17 — Deploy and verify production setup

- **Status:** In progress
- **Priority:** Must
- **Depends on:** T-02, T-15, T-16
- **Related:** Constraints; F-19
- **Goal:** Publish the approved MVP on free-tier services and confirm production behavior.
- **Scope:** Configure Cloudflare Pages, Supabase, Brevo, production secrets, migrations, admin provisioning, storage policies, sender setup, and deployment/rollback instructions.
- **Done when:**
  - [ ] Public routes and `/admin` work over HTTPS on the provider subdomain.
  - [ ] Production secrets stay outside source control.
  - [ ] Production smoke checks cover public content, admin access, uploads, contact save, and email behavior.
  - [ ] Brevo sender/deliverability limitations without a custom domain are checked and documented.
- **Verify:** Follow the deployment and rollback checklist; record commit and smoke-check results.

#### T-18 — Add scheduled Supabase keep-alive

- **Status:** Not started
- **Priority:** Should
- **Depends on:** T-17
- **Related:** F-19
- **Goal:** Reduce Supabase inactivity risk using a scheduled task on a free-tier service.
- **Scope:** Configure the scheduled GitHub Actions keep-alive workflow described in `ARCHITECTURE.md`. Database exports and automated backups are out of scope for this version.
- **Done when:**
  - [ ] Workflow uses least-privilege secrets and reports failures without exposing credentials or message contents.
  - [ ] The workflow confirms Supabase activity and its schedule is documented with known limitations.
- **Verify:** Trigger a manual workflow run and confirm its result in GitHub Actions.

## 5. Release checklist

- [ ] All Must tasks are Done and their acceptance criteria are verified.
- [ ] Configured automated checks and production build pass.
- [ ] Authorization, validation, and failure recovery have been reviewed.
- [ ] Documentation and safe environment examples match the deployed system.
- [ ] Deployment and rollback steps are understood.
- [ ] Free-tier service limits and Brevo sender setup have been checked before launch.

## 6. Blockers and deferred work

- **Current specification blockers:** None. Production smoke checks, Brevo sender/deliverability, and free-tier service checks are tracked as launch-readiness work in T-17.
- **Deferred:** Database exports and automated backups; improved link previews; Telegram notifications; custom icons for arbitrary contact platforms; theme switching; CAPTCHA/rate limiting; app-side image compression; video demos; analytics; dashboard overview; custom page builders and sections.
