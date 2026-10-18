# Developer Portfolio

A personal portfolio website for showcasing projects, skills, and background to recruiters and other visitors. A private dashboard will let the owner update portfolio content and manage messages without editing code.

## Status

**Implementation in progress.** T-02 established the application and service configuration. Public and admin features follow the sequence in `docs/TASKS.md`.

## Planned features

- One scrolling public page with Home, Projects, About, and Contact sections, plus separate project detail pages.
- Responsive project galleries and lightbox; the Projects section lists every saved project and each has a separate detail page.
- One dark theme and skills shown as bullet lists grouped under admin-managed categories on About.
- Private admin dashboard for projects, profile, homepage intro, contact methods, and messages.
- Contact form that saves visitor email and message to Mailbox and sends an email notification.

## Planned stack

- **Frontend:** Plain JavaScript with React and Vite.
- **Database and storage:** Supabase Postgres and Storage.
- **Authentication:** Supabase Auth with email/password and Google sign-in for the designated administrator only.
- **Trusted backend:** Supabase Edge Functions for contact-message validation, persistence, and notification.
- **Hosting:** Cloudflare Pages.
- **Email:** Brevo for administrator verification/password recovery and contact-message notifications.
- **Keep-alive:** Scheduled GitHub Actions task for Supabase activity.

The project is intended to use free tiers only. No custom domain, automated database exports, or paid dependencies are planned for this version.

## Documentation

- [Product requirements](docs/PRD.md)
- [Application flows](docs/APP_FLOW.md)
- [Design and UX](docs/DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data schema](docs/SCHEMA.md)
- [Implementation tasks](docs/TASKS.md)
- [AI agent instructions](AGENTS.md)

## Setup and development

### Requirements

- Node.js 24.20.0 (Node 24.x)
- npm 11.x (bundled with Node.js 24.20.0)

### Install and run

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

The app shell runs at `http://localhost:5173`. Supabase values in `.env.local` are public browser configuration only. Do not put service-role keys, Brevo credentials, or database passwords in `VITE_*` variables.

### Supabase migrations

The Supabase CLI and project configuration are versioned in this repository. Create migrations with `npx.cmd supabase migration new <name>` and commit the generated SQL under `supabase/migrations/`.

To apply pending migrations, authenticate and link this directory to the intended hosted Supabase project:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref <project-ref>
npm.cmd run db:push
```

Review migrations before applying them. The project does not require Docker or a local Supabase stack.

### Contact-form function

Deploy the public contact Edge Function after applying the mailbox migration:

```powershell
npx.cmd supabase functions deploy submit-contact
```

In Supabase Dashboard → Edge Functions → Secrets, set `BREVO_API_KEY` to a Brevo API key and `BREVO_SENDER_EMAIL` to a verified Brevo sender. `BREVO_SENDER_NAME` is optional. The SMTP key used by Supabase Auth is not the Brevo API key. The function reads Supabase URL and server credentials from the Edge Function runtime; never place service-role credentials in browser variables or commit secrets.

### Administrator authentication setup

The client has no sign-up flow. For the hosted Supabase project, disable public sign-ups, enable email confirmations, configure Brevo as the Auth SMTP provider, and enable Google with its OAuth client credentials in the Supabase Dashboard. Set the project's Auth redirect URLs to include the local callback and recovery routes (`http://localhost:5173/admin/callback` and `http://localhost:5173/admin/reset-password`) and the matching routes on the deployed site. For Google, the authorized OAuth callback URI in Google Cloud is the Supabase Auth callback URL shown in the Supabase provider settings.

Create or invite the one administrator from Supabase Auth, then verify that account. After migration `20261017000000_admin_authorization.sql` is applied, set the designated user ID from the Supabase SQL Editor (replace the placeholder with the administrator's Auth user UUID):

```sql
insert into public.admin_config (id, user_id)
values (true, '<ADMIN_AUTH_USER_UUID>')
on conflict (id) do update set user_id = excluded.user_id;
```

The browser cannot read or change `admin_config`. The designated user ID is checked by `public.is_designated_admin()` in database and Storage policies.

The Mailbox migration creates the required Email contact method with an empty value. After signing in as the designated administrator, configure the public contact and notification address under Admin → Mailbox. This address is independent of the login email.

### Build and preview

```powershell
npm.cmd run build
npm.cmd run preview
```

The Cloudflare Pages build command is `npm run build` and the output directory is `dist`. `public/_redirects` provides the SPA fallback for nested routes. Set `VITE_SITE_URL` to the production site origin so Auth redirects use the deployed domain; it can remain empty locally to use the current origin.

Keep all credentials and service secrets out of source control. Add only safe placeholder values to environment examples when they are created.

## Testing

Vitest is installed as the project test runner. Feature tasks will add tests alongside their behavior; run `npm.cmd test` after test files are present or `npm.cmd run test:watch` during development.

## Deployment

Production deployment is not configured yet. The planned target is Cloudflare Pages with Supabase and Brevo configured separately. Deployment steps will be documented before launch.

## Known limitations and deferred work

- Owner identity and final homepage copy will be added later.
- Improved social link previews are deferred until after the site exists.
- Telegram notifications, theme switching, CAPTCHA, application-level contact rate limiting, app-side image compression, automated database exports, video demos, analytics, and page builders are out of scope for this version.
- Supabase free-tier limits and Brevo sender/deliverability setup must be checked before launch.

## Contributing and AI-assisted development

Follow [AGENTS.md](AGENTS.md). Choose an actionable task from [docs/TASKS.md](docs/TASKS.md), read its linked specifications, inspect the existing code before editing, and verify its acceptance criteria before marking it complete.
