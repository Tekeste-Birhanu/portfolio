# Design and UX Specification

## 1. Design direction

- **Product feel:** Minimal, calm, personal, credible. It should read as one developer's own site, not a template.
- **Primary audience:** Recruiters, hiring managers, and internship contacts on the public site; the owner on the admin dashboard.
- **Design priorities:** Clarity, readability, simplicity, and honesty about real work (real screenshots, factual descriptions).
- **Reference products / inspiration:** None specified. The only guidance: avoid a generic, template-looking result.

## 2. Design principles

- **Content first.** Real project screenshots and concise text carry the page. Do not add decoration or content only to fill space.
- **Restraint.** The terracotta accent is used sparingly. Avoid extra sections, repeated subtitles, and multiple calls to action.
- **Consistency.** The same patterns (buttons, tags, dialogs, empty states) appear across public pages and the admin.
- **Single theme.** The site uses one light theme. There is no dark-mode toggle or saved theme preference.
- **Never leave users guessing.** Every action gives feedback, and every empty or failed state says what happened and what to do next.

## 3. Visual foundations

Values below are initial decisions. Verify contrast with a checker during implementation and tune sizes once real content is in.

- **Typography:**
  - Monospace stack for the site name, navigation, headings, tags, dates, buttons, and labels: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`.
  - System sans-serif for paragraphs and long text: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
  - Sizes in `rem`, base 1rem. Hierarchy: page title 1.75rem, section heading 1.25rem, body 1rem (line height 1.6), metadata and labels 0.875rem.
  - No font files are downloaded.
- **Color** (CSS variables for the single light theme):

  | Role                             | Light value |
  | -------------------------------- | ----------- |
  | Background                       | `#FAFAF8`   |
  | Surface (cards, inputs, dialogs) | `#FFFFFF`   |
  | Text                             | `#222222`   |
  | Muted text                       | `#5C5C5C`   |
  | Border                           | `#E2E0DB`   |
  | Accent (terracotta)              | `#A9472A`   |
  | Error                            | `#B3261E`   |
  | Success                          | `#1B6E3C`   |
  - The accent is used for links, the primary button, and the selected thumbnail, not for large areas.
  - Text and interactive elements meet WCAG 2.1 contrast (4.5:1 for text, 3:1 for interface boundaries). Color is never the only signal: errors and status always include words or an icon.

- **Spacing:** Scale in multiples of 4px: 4, 8, 12, 16, 24, 32, 48, 64. Public pages use a centered column about 56rem wide (896px at the 16px base size); keep long text blocks narrower within that column for readability. Admin screens may be wider (about 72rem) for tables.
- **Shape and elevation:** Corner radius 4px on buttons, inputs, tags, and images. 1px borders. No shadows. The lightbox uses a dimmed backdrop only.
- **Icons and imagery:**
  - One monochrome icon set drawn in the current text color. Contact methods always show a text label. Use a built-in icon where available and a generic link icon for any other platform.
  - Imagery is the owner's actual screenshots and profile photo, never stock illustrations.
  - The owner manually optimizes files before upload. The app stores and serves uploaded originals without compression or generated variants. Images keep their aspect ratio and are not cropped or stretched; gallery thumbnails are display controls using the same uploaded files.
- **Responsive behavior:** Three ranges: phone (under 640px), tablet (640px to 1023px), desktop (1024px and up). Layouts rearrange rather than shrink. The sticky public header stays compact on phones: brand and a keyboard-operable menu control share one row, and the menu opens as a panel.
  - Homepage project entries: image beside text from 640px up, stacked below.
  - Admin: sidebar from 1024px up; a compact menu below.
  - No horizontal scrolling at 320px width; wide content scrolls inside its own container.

## 4. Components and patterns

| Component / pattern            | Purpose                                                                           | Required behavior / variants                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Button                         | Actions                                                                           | Primary (accent), secondary (outline), danger (for Delete); disabled and loading states; loading blocks a second click.             |
| Text field, text area, select  | Input                                                                             | Visible label, optional hint, inline error linked to the field, keeps entered text on error.                                        |
| Tag                            | Skills, technologies, and project status                                          | Small, bordered, monospace; skills and technologies appear as pills; status shows "In progress" or "Completed" as words.            |
| Toggle switch                  | Enable or disable a contact method                                                | Labeled, keyboard operable, state announced; the required Email method cannot be disabled.                                            |
| Site header and navigation     | Public navigation                                                                 | Stays pinned at the top while scrolling; Home, Projects, About, Contact; collapses to a compact menu on phone.                       |
| Admin sidebar and compact menu | Admin navigation                                                                  | Projects, Profile, Homepage, Mailbox, sign out; sidebar on desktop, compact menu below 1024px.                                      |
| Project entry                  | Homepage and Projects list                                                        | Name with status beside it, description, technologies on their own line, links, and a "View details" action; image beside text on wide screens, stacked on phone. |
| Gallery                        | Project detail screenshots                                                        | One main image; thumbnails below only when there are several; selected thumbnail marked with the accent border.                     |
| Lightbox                       | Larger screenshot view                                                            | Close button, previous and next, arrow keys and Escape, swipe on touch; focus moves into it and returns to the main image on close. |
| Confirmation dialog            | Delete project, delete message, delete contact method, leave with unsaved changes | Names the item, clear primary and cancel actions, Escape cancels, focus is trapped while open.                                      |
| Inline notice                  | "Saved" and error messages                                                        | Appears near the action, announced to screen readers, does not block the page.                                                      |
| Admin list row                 | Projects list                                                                     | Name, Home featured toggle, last updated, Edit, Delete; drag handle reorders projects; becomes a stacked row on phone.              |
| Image upload area              | Project screenshots, profile photo, CV                                            | Preview, alt text field for project images, set main image, reorder, replace, remove; shows file type and size errors. Project images are manually optimized and served as uploaded; CV PDF limit is 10 MB. |
| Notification warning           | Mailbox messages                                                                  | Failed email notification is marked in both the message row and the opened message; the saved message remains available.             |
| Empty state                    | No content                                                                        | One plain line, with the next action where one exists.                                                                              |

## 5. Screen-specific guidance

### Home

- **Purpose:** Introduce the developer and highlight administrator-selected projects.
- **Layout:** Centered intro, then the vertical list of featured projects, then a skills section grouped by administrator-defined category headings, with pill-style items under each heading.
- **Primary action:** Open a project.
- **Secondary actions:** "Browse projects" opens the Projects page.
- **Content and behavior:** One short intro, no extra subtitle or multiple call-to-action buttons. Show any number of projects the administrator has featured, in their order in the Projects list. If none are featured, omit the project list. In each project entry, place the status beside the project name and show technologies separately below the description.
- **Responsive changes:** Project image beside text from 640px up; stacked below.
- **Related flow:** J-01

### Projects

- **Purpose:** Browse featured projects first, then expand the list to include all projects.
- **Layout:** A vertical list in the same style as the homepage entries.
- **Primary action:** View details for a project.
- **Content and behavior:** Initially lists featured projects in administrator order. A clearly labeled "Expand to all" control reveals every saved project, including those not featured on Home. Each entry places the status beside the project name, shows technologies separately from status, and has a clearly labeled "View details" action to its individual page. If there are no featured projects, explain that and keep "Expand to all" available when unfeatured projects exist. Show "No projects yet" only when there are no saved projects.
- **Responsive changes:** Same as Home.
- **Related flow:** J-01

### Project detail

- **Purpose:** Show one project in full.
- **Layout:** A prominent "Back to Projects" link directly below the header and above the title; then name and status, short description, gallery, technologies, links, detailed description, and populated optional detail sections. Repeat "Back to Projects" at the bottom of the page.
- **Primary action:** Open the live demo or repository, when set.
- **Content and behavior:** Show all saved project information. Optional sections appear in a fixed order and are omitted when empty. Link buttons appear only when a link exists. External links open in a new tab. The back links return to the full Projects list. On top-level public pages, visitors use the persistent site navigation instead of a redundant back button.
- **Responsive changes:** Gallery fills the column width; thumbnails wrap or scroll within their own row.
- **Related flow:** J-01

### About

- **Purpose:** Give background and the CV.
- **Layout:** Intro, education, and experience sections, followed by a CV download link when a CV exists. When a profile photo has been uploaded, show it beside the intro on wide screens and above it on phones. Without a photo, the intro uses the available width. Skills are shown on Home under category headings, not as About-page sections.
- **Content and behavior:** The administrator edits the intro, education entries, experience entries, optional photo, and CV in Profile. Show the intro, education, and experience sections only when they have content. Omit empty sections; show the CV link only when a CV exists.
- **Related flow:** J-02

### Contact

- **Purpose:** Let visitors reach the owner.
- **Layout:** Two side-by-side panels on tablet and desktop: all enabled contact methods in one panel and the message form in the other. Stack the panels on phones.
- **Primary action:** Send message.
- **Content and behavior:** List every enabled contact method in administrator order. Exactly one Email method is configured and always enabled; it is independent of the admin login email and receives message notifications. Other methods can be for any platform. The form has visitor email and message fields. It shows field errors and a busy state; after the message is saved, it shows success and clears the form. A save error includes the configured contact email and keeps the typed text. If email notification fails after saving, Mailbox shows a warning in both the message row and opened message.
- **Related flow:** J-02

### Admin sign-in

- **Purpose:** Let the administrator in.
- **Layout:** A single centered form (email, password, Google button, forgot-password link).
- **Content and behavior:** Errors never say which field was wrong. A "content can't load right now" message appears if the service is unavailable.
- **Related flow:** J-03

### Admin Projects list

- **Purpose:** Manage projects; the landing page after login.
- **Layout:** Search field and Add project button above a compact table: name, Home featured toggle, last updated, actions, and a drag handle.
- **Primary action:** Add project.
- **Secondary actions:** Feature or unfeature, Edit, Delete, and drag rows to set project order.
- **Content and behavior:** Any number of projects can be featured. Home displays the featured subset in the same order as the Projects list; every project remains on the public Projects page. Dragging also works by keyboard. Delete opens a confirmation naming the project.
- **Responsive changes:** Rows become stacked on phone.
- **Related flow:** J-03, J-06

### Admin project editor

- **Purpose:** Create or edit one project on a single page.
- **Layout:** Sections in order: basic information, descriptions, technologies, status, links, screenshots, optional details. Technologies use a multi-select picker with an "Add new technology" option. One Save button, always reachable.
- **Primary action:** Save.
- **Content and behavior:** Existing technologies are offered for selection. The admin can create a new technology from the picker; it is added to the shared list and selected for the current project. The editor stays open after saving, with a "Saved" notice. Leaving with unsaved changes opens the confirmation dialog.
- **Related flow:** J-03

### Admin Profile, Homepage, and Mailbox

- **Purpose:** Edit About content, photo, CV, skill categories, and skills (Profile); edit homepage text (Homepage); read messages and manage contact methods (Mailbox).
- **Layout:** Profile uses clear sections for About content, education, experience, media, and skill categories. Each category has its own ordered list of skill pills and controls. Mailbox has a messages list with unread messages marked, and a contact methods section.
- **Primary action:** Save (Profile, Homepage); open a message (Mailbox).
- **Content and behavior:** In Profile, category headings and skill lists can be added, renamed, and reordered; skills can be added, renamed, reordered within a category, moved, or removed. A category can be deleted only when it has no skills. Messages are ordered newest first; opening a message marks it read. Notification failure is marked in the message list and opened message. Exactly one Email contact method exists; it can be edited but cannot be deleted or disabled. Other contact methods can be managed with add, edit, enable/disable, reorder, and remove actions.
- **Related flow:** J-04, J-05

## 6. Interaction and UI states

- **Default / hover / focus / pressed / disabled:** Hover and pressed states are subtle (a border or tint change). Focus is always visible (a 2px accent outline with an offset). Disabled controls are visibly dimmed and not focusable.
- **Loading:** A short plain "Loading" line in place of content. Buttons show a busy state and block a second click.
- **Success:** An inline "Saved" notice near the Save button; a success message on the contact form.
- **Empty:** One plain line, such as "No projects yet" or "No messages."
- **Validation error:** An inline message next to the field, and focus moves to the first invalid field on submit. Entered values are kept.
- **System error:** A message that says what failed and what to do next. Contact errors include the configured contact email address.
- **Notification failure:** The visitor still sees success once their message is saved. Mailbox shows a warning on the affected message in both the list and detail view.
- **Confirmation for destructive or irreversible actions:** Deleting a project, message, or contact method, and leaving a form with unsaved changes, always opens a dialog. There is no undo.
- **Feedback and recovery:** Failed saves and uploads keep the user's input and allow a retry.
- **Motion:** Kept minimal (short fades only). Reduced-motion preferences remove animation, including lightbox transitions.

## 7. Accessibility

- Target: WCAG 2.1 level AA for the public site and the admin dashboard.
- Use semantic structure: one `h1` per page, landmark regions, real buttons and links.
- Every interactive element works by keyboard, with visible focus and a logical order. Dialogs and the lightbox trap focus and return it on close.
- Homepage ordering works by keyboard as well as by dragging.
- Meaningful labels and accessible names for icon-only controls; contact-method icons are decorative because the label is always visible.
- Every screenshot has alt text, written by the administrator in the editor.
- Form errors are linked to their fields and announced to screen readers.
- Text and interface contrast meet the targets above, and color is never the only signal.
- Touch targets are at least 44px tall.
- Content reflows with no horizontal scrolling at 320px width, and text can be zoomed to 200%.
- Respect the reduced-motion preference.

## 8. Content guidelines

- **Tone:** First person, plain, concise, and factual. No marketing language.
- **Labels and messages:** Use the same names everywhere: Projects, Profile, Homepage, Mailbox, "In progress", "Completed". Sentence case. Buttons start with a verb (Save, Delete, Send message).
- **Dates, numbers, and localization:** English only. Dates read like "15 Oct 2026".
- **Errors:** Say what happened and what to do next. Never blame the user, and never reveal which part of a sign-in was wrong.

## 9. Open design questions

- **Final homepage intro wording.** Placeholder copy can be used until launch; it does not block the build.
