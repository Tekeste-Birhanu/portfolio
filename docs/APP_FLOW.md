# Application Flow

## 1. Purpose

Describes how visitors and the administrator move through the site, including navigation, access, key states, and recovery. Visual styling is defined in `DESIGN.md`; requirements are defined in `PRD.md`. Admin route names are working names.

## 2. Navigation map

```text
Public (any visitor)
[/] Single scrolling public page
  ├── #home                 Owner name and short introduction
  ├── #projects             All projects in admin order; each opens a separate detail page
  ├── #about                Background, categorized skills, and optional CV download
  └── #contact              Configured contact links and message form
      /projects/<slug>      Separate project detail and screenshot lightbox

Admin (not linked publicly)
[/admin]
  ├── No session → Sign in (email/password or Google)
  │     └── Forgot password → /admin/reset-password
  │     └── Google callback → /admin/callback
  └── Designated administrator session → Projects
        ├── /admin/projects       Projects list, search, ordering
        ├── /admin/projects/new   Add project
        ├── /admin/projects/<id>  Edit project
        ├── /admin/profile        About content, photo, CV, skills
        ├── /admin/homepage       Homepage text
        └── /admin/mailbox        Messages and contact methods
```

The Home section contains the owner's name and short introduction. The call-to-action link is undecided and omitted for now. The Projects section on the same scrolling page lists every saved project in administrator-defined order, using two columns on wide screens and one on narrow screens. There is no Browse projects action or expand control. Each listed project links to its separate detail URL. A deleted project and its files are removed; its old URL shows the 404 page. Renaming a project redirects its old URL to the current one.

## 3. Main journeys

### J-01 — Visitor reviews projects

- **Actor:** Visitor
- **Entry point:** Home, Projects, or a direct project URL
- **Steps:** Read the Home introduction; navigate to Projects and scan the ordered project list; select "View details" on a project; review its description, screenshots, technologies, status, links, and populated detail sections; use the lightbox to navigate its images; follow a repository or demo link if present.
- **Success:** The visitor understands the project and can reach its repository or demo.
- **Failure and recovery:** Unknown or deleted project URLs show a 404 page with a link home. Old project URLs redirect to the current slug. A failed image shows its alt text or a placeholder.
- **Related requirements:** F-01, F-02, F-03, F-04

### J-02 — Visitor learns about the owner and makes contact

- **Actor:** Visitor
- **Entry point:** About or Contact
- **Steps:** Read the About content and download the CV if available; on Contact, choose an enabled contact link or enter an email address and message in the form; submit; see confirmation after the message is saved.
- **Contact links:** The configured Email link opens the visitor's email app. Other enabled methods (for example, Telegram, GitHub, or a social platform) open their configured destinations in a new tab.
- **Message submission:** The server validates the visitor's email and message, saves the message in Mailbox, then attempts an email notification to the configured contact email. The visitor's email is set as Reply-To in that notification.
- **Success:** The message is saved and the visitor sees success. The form is cleared after successful saving.
- **Failure and recovery:** Validation or save errors keep the visitor's text for correction or retry. A save failure shows the configured contact email as an alternative. If saving succeeds but email notification fails, the visitor still sees success; the message remains in Mailbox and displays a notification warning.
- **Related requirements:** F-05, F-06, F-18, F-19

### J-03 — Administrator adds or edits a project

- **Actor:** Designated administrator
- **Entry point:** `/admin`, typed or bookmarked
- **Preconditions:** The administrator account has been provisioned; an enabled contact email has been configured before the public Contact page goes live.
- **Steps:** Sign in with email/password or Google; open Projects; add a project or edit an existing one; enter project details, links, status, and optional sections; choose technologies from the existing list or create a new one in the picker; save a new project, then upload screenshots or GIFs, enter alt text, choose the main image, and order the gallery. Media changes save immediately. Set the public Projects order by dragging items in the Projects list.
- **Success:** The saved project detail route is live immediately, and the project appears in the public Projects section in the administrator's chosen order. The editor remains open and shows a saved confirmation.
- **Failure and recovery:** Required-field errors, upload errors, or save errors preserve entered values. Failed Storage cleanup is recorded for a manual retry; project deletion includes queued paths and retains the project if cleanup fails. Leaving with unsaved changes asks whether to stay or discard changes. A forgotten password starts the email recovery flow. Invalid or expired recovery links show an error and offer a new reset request; a password form is available only after Supabase confirms a recovery event. An authenticated user who is not the designated administrator is denied and signed out. The app stores the administrator session in the current tab and signs out after 10 minutes without activity; an expired session returns to sign-in. Email sign-in requires a verified account; no public registration is available.
- **Related requirements:** F-08, F-09, F-10, F-11, F-12, F-13

### J-04 — Administrator maintains profile, homepage, and contact methods

- **Actor:** Designated administrator
- **Entry point:** Admin navigation to Profile, Homepage, or Mailbox
- **Steps:** Edit About content, profile photo, CV, skill categories and their skills, or predefined homepage text and save. In Mailbox, add, edit, enable/disable, reorder, or remove a contact method. A method includes a label and a value or link; the administrator can use any platform. Supported platforms may have a built-in icon; other platforms use a generic link icon.
- **Skill management:** Add, rename, and reorder categories; add, rename, reorder, move, or remove skills. A category can be removed only after all its skills have been moved or removed. About shows skills as pill items grouped under category names and omits empty categories.
- **Email invariant:** Exactly one Email contact method exists. Its value can be edited, but the method cannot be disabled or removed. This address is shown on Contact and receives message notifications; it is independent of the admin login email. Configure it in Mailbox before public launch.
- **Success:** Saved changes are live on the public site.
- **Failure and recovery:** Invalid values, unsupported file types, and oversized files show field-level errors and preserve prior saved content. Leaving with unsaved changes asks whether to stay or discard changes.
- **Related requirements:** F-15, F-16, F-17

### J-05 — Administrator handles messages

- **Actor:** Designated administrator
- **Entry point:** Admin navigation → Mailbox
- **Steps:** See messages ordered newest first, with unread messages marked; open a message (which marks it read); use the sender's email as Reply-To in the notification to reply from the administrator's email app; mark a message unread again or delete it after confirmation.
- **Notification warning:** If a saved message's notification email fails, Mailbox shows a warning on that message. The saved message remains available.
- **Success:** The administrator can review and manage the inbox. An empty inbox shows “No messages.”
- **Failure and recovery:** Cancelling a deletion changes nothing. A failed read-state update or deletion shows an error and keeps the message available for retry.
- **Related requirements:** F-18, F-19

### J-06 — Administrator permanently deletes a project

- **Actor:** Designated administrator
- **Entry point:** Projects list → Delete
- **Steps:** Choose Delete; review a confirmation naming the project and stating that deletion is permanent; confirm.
- **Success:** The project and all its stored files are deleted, and its public page returns 404.
- **Failure and recovery:** Cancelling changes nothing. If Storage cleanup fails, keep the project record, show an error, and allow retry; do not claim deletion succeeded until all files and records are removed. Retrying safely handles files already removed.
- **Related requirements:** F-14

## 4. Screen and route inventory

| Screen / route | Purpose | Access | Related journeys |
| --- | --- | --- | --- |
| `/` and `/#home` | Single scrolling public portfolio, starting at the intro | Anyone | J-01, J-02 |
| `/#projects` | All projects in admin order; two columns on wide screens, one on narrow screens | Anyone | J-01 |
| `/projects/<slug>` | Project detail and screenshot lightbox | Anyone | J-01 |
| `/#about` | About section, categorized skills, and optional CV download | Anyone | J-02 |
| `/#contact` | Enabled contact methods and email/message form | Anyone | J-02 |
| 404 | Unknown or deleted addresses | Anyone | J-01, J-06 |
| `/admin` | Sign-in, then redirect to Projects when signed in | Sign-in is public; dashboard is administrator-only | J-03 |
| `/admin/reset-password` | Request a reset link, or set a new password after a valid recovery event; invalid/expired links show an error and allow a new request | Anyone | J-03 |
| `/admin/projects` | Search, order, edit, and delete projects | Designated administrator | J-03, J-06 |
| `/admin/projects/new`, `/admin/projects/<id>` | Add or edit a project | Designated administrator | J-03 |
| `/admin/profile` | About content, photo, CV, and skills | Designated administrator | J-04 |
| `/admin/homepage` | Predefined homepage text | Designated administrator | J-04 |
| `/admin/mailbox` | Messages and contact-method management | Designated administrator | J-04, J-05 |

## 5. Shared states and edge cases

- **Loading:** Public pages and admin screens show a loading state while content is fetched. Forms and save buttons block duplicate submissions while working.
- **Empty:** Projects and Mailbox show clear empty states. Empty skill categories are omitted from About; empty About subsections are omitted. If no projects are saved, Projects shows "No projects yet".
- **Success:** Saves show confirmation. The contact form shows success only after its message has been saved, regardless of notification delivery.
- **Errors:** Explain what failed and what to do next. Form input is retained after validation or save errors. A failed email notification is shown as a warning on the saved message in Mailbox.
- **Supabase unavailable:** Public pages show a clear temporary-unavailability message and a retry option when content cannot be fetched. Admin screens show a service-unavailable message. No cached copy of site content is promised.
- **Unauthorized:** Admin routes without a session show sign-in. A signed-in non-administrator is denied access and signed out. Hiding `/admin` from navigation is not an authorization control.
- **Destructive actions:** Project and message deletion require confirmation. There is no undo in V1.
- **Offline/interrupted:** Contact submission errors preserve the visitor's email and message. Admin forms warn before leaving with unsaved changes.

## 6. Flow rules

- Public content is available to visitors; private admin data and writes require the designated administrator under Supabase authorization policies.
- Saving content makes it live immediately; there is no draft, preview, or publish step.
- Every saved project has a separate detail route and appears in the Projects section in shared administrator-defined order. Skills are displayed on About grouped by category, with empty categories omitted. Deletion is permanent; rename redirects old slugs to the current slug.
- Enabled contact methods appear in the administrator's order. Exactly one Email method exists; it cannot be disabled or removed, and its contact/notification address is not the login email.
- A contact form submission is stored before email notification is attempted. The visitor's address is the notification's Reply-To. Notification failure does not lose the message or change the visitor's success state; Mailbox shows a warning.
- Opening a message marks it read; the administrator can mark it unread again.
- External contact, repository, and demo links open in a new tab.
- Leaving an admin form with unsaved changes asks the administrator to stay or discard changes.
