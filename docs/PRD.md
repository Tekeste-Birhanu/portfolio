# Product Requirements Document

## 1. Overview

- **Product:** Developer Portfolio (working title; owner identity and final name to be added later)
- **Status:** Draft
- **Summary:** A personal developer portfolio website with a private dashboard that lets the owner manage all public content (projects, skills, About, contact details) without editing code.
- **Target users:**
  - Visitors: recruiters, hiring managers, and internship/junior-role contacts.
  - Administrator: the portfolio owner (exactly one user).
- **Problem:** A junior developer needs a credible, personal site that shows real projects. Generic templates look impersonal, and hard-coded sites need code changes for every update. This product presents real work cleanly and keeps content easy to maintain.

## 2. Goals and scope

**Goals:**

- Visitors can quickly see who the developer is, browse real projects, check skills and background, and make contact.
- The administrator can add, edit, and remove all public content from a secure dashboard on desktop or mobile.

**In-scope features:**

- Public site: a single scrolling Home page with Projects, About, and Contact sections, plus separate project detail pages.
- Project detail: screenshots and GIF demos, gallery with lightbox, technologies, status, optional links, four optional detail fields.
- Admin dashboard: Projects, Profile, Homepage, Mailbox (messages and contact methods).
- Contact form with stored messages and email notification to the owner.

**Out of scope:**

- Page builder, custom homepage sections, custom project-detail sections, editable navigation.
- Admin theme customization and a global settings area.
- Autosave, multiple administrators, public registration.
- Built-in message replies (replies are sent from the owner's own email app).
- Custom contact-method platform icons; arbitrary platforms use a generic link icon.
- Telegram notifications (deferred until a later version).
- Dark mode and theme switching; the site uses a single light theme.
- CAPTCHA/Turnstile and application-level rate limiting for the contact form.
- Video demos, analytics or overview dashboards.

**Constraints:**

- Free services and free tiers only; no paid dependency.
- Free provider subdomain (no custom domain for now), so the admin lives at a `/admin` route, not a subdomain.
- Supabase free plan limits (including database and file storage quotas, and pausing after inactivity).
- Stack: plain JavaScript, React (Vite), Supabase Database and Auth, Cloudflare Pages, and Brevo for transactional email delivery.
- No deadline.

## 3. User journeys

- **J-01 — Recruiter reviews the developer:** Opens the homepage → reads the intro → selects Projects in the section navigation → scans the ordered project list → selects View details → views screenshots in the lightbox → opens the repository or live demo.
- **J-02 — Recruiter learns background and makes contact:** Opens About → reads background and downloads the CV → opens Contact → sees the owner's email address or submits their email address and message → sees a clear success or error result.
- **J-03 — Administrator adds a project:** Logs in → lands on Projects → creates a project → fills the fields, picks or adds technologies, uploads screenshots → saves → the project detail route is live; the administrator can choose whether it appears in the public Projects section.
- **J-04 — Administrator maintains other content:** Edits Profile (About intro, CV, education, experience, skill categories, and skills) or Homepage text and photo → saves → changes are live.
- **J-05 — Administrator handles messages:** Opens Mailbox → reads a new message → marks it read/unread or deletes it → replies from their own email app.
- **J-06 — Administrator deletes a project:** Chooses Delete on a project → confirms in a dialog that names the project → the project and its images are removed completely.

## 4. Functional requirements

| ID   | Requirement                                                                                                 | Acceptance criteria                                                                                                                                                                                                                                                                                                | Priority |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| F-01 | Home owner name, editable role, introduction, call-to-action buttons, and optional profile photo. | Home shows the owner's name in bold, an editable role (default “Software Developer”), and a short intro. An optional profile photo sits beside the text on wide screens and below it on phones. Admin can edit the labels and links for “Get in touch” and “View my GitHub”; the GitHub button is hidden until its URL is set. The Projects section shows every saved project in administrator-defined order; each shows name, description, technologies, status, links when present, and a link to its detail page. Use two columns on wide screens and one on narrow screens. There is no Browse projects action or expand control. | Must     |
| F-02 | Projects section and individual detail pages.                                                       | The Projects section on the same scrolling page lists every saved project in administrator-defined order. Every project has a separate detail page; a deleted project's address shows the 404 page. | Must     |
| F-03 | Optional project detail fields (Key features, Technical details, Challenges and solutions, What I learned). | Fields display in that fixed order; empty fields are not rendered; no other custom sections exist.                                                                                                                                                                                                                 | Must     |
| F-04 | Screenshot gallery and lightbox.                                                                            | One main image with clickable thumbnails (none for a single image); clicking the main image opens a lightbox with close, previous, and next; arrow keys navigate and Escape closes; usable by touch.                                                                                                               | Must     |
| F-05 | About page.                                                                                                 | Shows the intro, education, and experience sections only when each has content; the CV download link appears only when a CV exists.                                                                                                                                                                                 | Must     |
| F-06 | Contact page with one configured email contact method and a form (visitor email and message).                  | The server validates required fields and email format; visitor email is limited to 254 characters and message to 5,000 characters; the message is saved to the administrator's mailbox and a Brevo notification is sent to the configured contact email with the visitor as Reply-To; success is shown once saved even if notification delivery fails; if saving fails, the error shows the configured contact email and keeps the visitor's text. | Must     |
| F-08 | Administrator login.                                                                                        | Supabase Auth provides email/password and Google login for the designated administrator, including email verification and password reset; the browser stores the session per tab and signs out after 10 minutes without activity; Brevo delivers the related emails; there is no public sign-up; database policies reject anyone who is not the designated administrator.                                      | Must     |
| F-09 | Projects dashboard landing page.                                                                   | The dashboard has a sidebar navigation. The Projects landing page shows every project in a two-column list on wide screens and one column on narrow screens, with name, last updated, and actions; search by name; drag to set order. Edit and Delete are available per project.                                                                                                                                                 | Must     |
| F-10 | Single-page project editor with explicit Save.                                                              | First save requires name, short description, and status (Planning, In progress, or Completed); a saved project is immediately live; no autosave; leaving with unsaved changes shows a dialog with Stay or Leave and discard. The technology picker lists technologies already added to other projects, allows selecting multiple, and lets the admin create a new technology from the same control; a newly created technology is selected for the current project and becomes available for later projects. | Must     |
| F-11 | Screenshot and GIF management.                                                                              | Accepts JPG, PNG, and WebP up to 5 MB and GIF up to 10 MB, checked on the server; the owner manually optimizes files before upload; the app stores and serves each original upload without compression or generated variants; each project is capped at 10 images and 2 GIFs; every image has alt text; the administrator can reorder, set the main image, replace, and remove; removed files are deleted, with an error and retry if storage cleanup fails. | Must     |
| F-12 | Project URLs.                                                                                               | The URL is generated from the project name and is unique; after a rename the old URL redirects to the new one.                                                                                                                                                                                                     | Must     |
| F-13 | Project ordering.                                                                             | Every saved project appears in the public Projects section. The administrator sets the shared public order by dragging projects in the admin Projects list.                         | Must     |
| F-14 | Delete project.                                                                                             | Delete requires explicit confirmation that names the project; success is shown only after the project and all its files are removed completely; if file cleanup fails, the project record remains and the administrator can retry.                                                                                                                                     | Must     |
| F-15 | Profile management (About content, CV, education, work experience, skill categories, and skills).               | The administrator can edit the About intro; manage separate reorderable education entries (institution and qualification/course required; optional free-form date range and description) and experience entries (organization and role required; optional free-form date range and description); upload a CV (PDF, up to 10 MB); add, rename, reorder, and remove skill categories, removing a category only when it is empty; add, rename, reorder, move between categories, and remove skills. About groups skill pills under category names and omits empty categories. | Must     |
| F-16 | Homepage content and photo editing.                                                                                | The administrator can edit the role, intro, and labels and links for two predefined homepage call-to-action buttons, and manage an optional profile photo (JPG, PNG, or WebP, up to 5 MB); section structure and order cannot change.                                                                                                                              | Must     |
| F-17 | Contact methods management (in Mailbox).                                                                    | The administrator can add, edit, enable/disable, reorder, and remove methods for any platform using a label and value/link; supported icons are built in where available and a generic link icon is used otherwise; exactly one Email method exists and it cannot be disabled or removed; its value is the public contact and notification address and is independent of the login email. | Must     |
| F-18 | Messages management (in Mailbox).                                                                           | The administrator can list and open messages, mark them read or unread, and delete them; each shows visitor email, message, and date.                                                                                                                                                                             | Must     |
| F-19 | Email notification and keep-alive.                                                                          | A new message triggers a Brevo email to the configured contact email; notification failure never loses the saved message and is shown as a warning in Mailbox; a scheduled task keeps the Supabase project active. Database exports are out of scope for this version. | Should   |

- **Business rules:**
  - Saving content makes it live; there is no draft or preview layer.
  - Every saved project appears in the public Projects section and has a separate detail route until it is deleted. Projects use the administrator-defined shared order. There is no archive state. Deleting a project removes it and its files completely.
  - Every uploaded file belongs to exactly one item; deleting the item or file deletes its stored files.
  - Authorization for all admin actions is enforced by Supabase database policies, not by hidden pages.

## 5. Quality requirements

- **Performance:** The owner optimizes images before upload; the app serves the uploaded originals without generating variants. Animated GIFs load only in the main image and lightbox.
- **Security and privacy:**
  - Every admin action and private file operation is authorized by Supabase database and storage policies, not by the interface alone.
  - Administrator sessions are stored for the current tab and the app signs out after 10 minutes without activity.
  - All input is validated at the trusted backend boundary: required fields, URLs, the visitor contact-form limits (email 254 characters; message 5,000 characters), file types, and file sizes. No product-level text-length caps apply to other content fields.
  - Editable content is rendered as plain text, never as HTML or scripts.
- **Reliability and recovery:** A contact message is saved before any email is attempted, so a failed email never loses a message.
- **Other relevant needs:** The public site and the admin dashboard are responsive on desktop, tablet, and mobile.

## 6. Assumptions and open decisions

- **Assumptions:**
  - Supabase and Brevo free-plan terms stay roughly as they are today and should be rechecked before launch.
  - The owner will have at least two real projects with screenshots at launch.
- **Dependencies / risks:**
  - External free services: Supabase, Cloudflare Pages, Brevo, and GitHub (scheduled task). Free-tier terms can change.
  - Supabase free projects pause after inactivity; the keep-alive task should prevent this and should be verified after launch.
  - A plain React app gives weaker link previews than server-rendered pages; this is accepted for simplicity.
- **Open decisions:**
  - Owner name, identity, and final homepage intro wording. Non-blocking: placeholder copy can be used until the owner supplies these details.
  - Approach for better link previews with a plain React app. Non-blocking; can be deferred until after the public site exists.
  - Brevo email sender setup and deliverability without a custom domain must be confirmed before launch; Brevo may rewrite unauthenticated sender addresses.

## 7. Definition of ready

- [x] The problem, target users, and scope are clear enough to begin.
- [x] Must-have requirements have testable acceptance criteria.
- [x] Important business rules and permissions are defined or explicitly not applicable.
- [x] Decisions that block the first implementation tasks are resolved; non-blocking questions are documented with a safe assumption or deferral.
- [x] Relevant design and technical requirements are clear enough to proceed without consequential guesswork. Remaining owner identity/copy and launch service checks are documented as non-blocking or pre-launch items.
