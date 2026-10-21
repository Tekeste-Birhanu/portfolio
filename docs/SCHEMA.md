# Data Schema

## 1. Overview

- **Database / storage:** Supabase Postgres and Supabase Storage.
- **Schema status:** Approved for implementation; database migrations will be authored in task order.
- **Source of truth:** Postgres stores structured content and file paths; Supabase Storage stores uploaded files; Supabase Auth stores administrator credentials and sessions.
- **Conventions:** UUID primary keys unless a singleton configuration row is explicitly described; timestamps are UTC; ordered lists use integer `sort_order`; deleting a content item permanently deletes its related records and stored files. No content is archived or soft-deleted. Storage deletion is retryable and idempotent.
- **Version scope:** No automated database exports or backups in this version.

The names below describe logical tables. Final SQL names, enum types, policies, and exact column types are set in migrations after this draft is reviewed.

## 2. Entities

### Designated administrator

- **Purpose:** Identify the single Supabase Auth user allowed to perform admin actions.
- **Fields:** One configured Supabase Auth user ID (`auth.users.id`). Store the allowlisted ID in a protected singleton configuration record or another server-controlled configuration source.
- **Constraints:** Exactly one designated administrator. Google sign-in is an admin sign-in option; it does not grant admin access unless the resulting user ID is the configured administrator. Public registration is disabled.
- **Sensitive data:** Supabase Auth owns password and session data. Never copy credentials or tokens into application tables.
- **Implementation:** `public.admin_config` stores the single allowlisted Auth user ID and is inaccessible to browser roles. `public.is_designated_admin()` returns only whether the current authenticated user matches that ID; RLS and Storage write policies use this function. Provision the row from the Supabase SQL Editor after creating the administrator account.
- **Related requirements:** F-08

### Homepage content

- **Purpose:** Legacy singleton row retained from the prior editable hero copy implementation. The current hero role and introduction are fixed in the app and this table has no application read/write path.
- **Fields:** Existing role, intro, updated-at, and historical CTA columns remain in the hosted schema. No active UI or public request uses them; removing the row/table would require a reviewed schema migration and discard stored copy/settings.
- **Constraints:** The legacy row does not control homepage sections or their order. Home copy and its image are bundled with the app.
- **Related requirements:** F-01, F-16

### Profile

- **Purpose:** Store the owner's About Me intro, legacy profile photo path, and current CV file path.
- **Fields:** Singleton row with `intro` (plain text, optional), `photo_storage_path` (optional), `cv_storage_path` (optional), and `updated_at`.
- **Constraints:** Empty fields are omitted publicly. The CV is a PDF up to 10 MB. The `photo_storage_path` field is retained for legacy data but is no longer read or written by the application; Home uses the bundled `public/profile-placeholder.jpg` asset.
- **Related requirements:** F-05, F-15
- **Implementation:** The singleton row is `public.profile_content` with `id = true`. The CV uses the `profile-cv` Storage bucket. The legacy `profile-photo` bucket, `photo_storage_path` column, and stored objects remain in the hosted schema; no application route accesses them. Failed CV cleanup is recorded in `public.profile_media_cleanup` for administrator retry from About.

### Profile media cleanup

- **Purpose:** Retain retryable Storage cleanup work when a CV is replaced or removed. Historical photo cleanup rows may remain from the former photo editor.
- **Fields:** `id`, `bucket_id` (`profile-photo` or `profile-cv`), `storage_path`, and `created_at`. New application cleanup rows use `profile-cv`.
- **Constraints:** Only the designated administrator can read or manage cleanup rows. Rows are removed only after the corresponding Storage object is deleted.
- **Implementation:** `public.profile_media_cleanup` is private under RLS and is introduced with the Profile editor.

The legacy `public.education_entries` table remains in the deployed schema to preserve existing records. Application roles have no access to it, and education is no longer queried or managed by the application.

### Work experience entry

- **Purpose:** Store one work or experience item on the About page.
- **Fields:** `id`, `organization` (required), `role` (required), `date_range` (optional plain text), `description` (optional plain text), `sort_order`, and timestamps.
- **Constraints:** Entries are independently added, edited, removed, and reordered. Date range and description may be omitted; date range can use forms such as `2021–2024` or `2022–Present`.
- **Related requirements:** F-15
- **Implementation:** Stored in `public.experience_entries`, linked to the singleton profile and ordered by `sort_order`.

### Skill category

- **Purpose:** Store an administrator-defined heading that groups related skills.
- **Fields:** `id`, `name`, `sort_order`, `created_at`, and `updated_at`.
- **Constraints:** Categories can be added, renamed, reordered, and removed only when empty. A database trigger rejects deletion while any skill references the category. Categories with no skills are omitted from the public About section.
- **Related requirements:** F-15

### Skill

- **Purpose:** Store one skill within a category.
- **Fields:** `id`, `category_id`, `name`, `sort_order`, `created_at`, and `updated_at`.
- **Constraints:** Each skill belongs to exactly one category. Skills can be added, renamed, reordered within their category, moved to another category, and removed. Public skills render as bullet lists grouped under their category name.
- **Related requirements:** F-15

### Project

- **Purpose:** Store a public portfolio project.
- **Fields:** `id`, `name`, `short_description`, optional `long_description`, `status` (`planning`, `in_progress`, or `completed`), optional `repository_url`, optional `live_demo_url`, optional `key_features`, `technical_details`, `challenges_and_solutions`, and `what_i_learned`, plus `sort_order`, `created_at`, and `updated_at`.
- **Constraints:** Name, short description, and status are required on first save. Every saved project appears in the public Projects section in `sort_order` and has a public detail route. There is no featured/unfeatured state, archive state, or soft delete. URLs must be validated. Saving makes changes live. Project deletion reports success only after all associated Storage files and database records are removed. If Storage cleanup fails, keep the project record and show an error with a retry option; retries must safely handle files already removed.
- **Related requirements:** F-01, F-02, F-03, F-09, F-10, F-13, F-14

### Project slug

- **Purpose:** Keep the current project URL and redirects from previous names.
- **Fields:** `id`, `project_id`, `slug`, `is_current`, `created_at`.
- **Constraints:** A slug is unique across all current and previous project slugs. Each project has exactly one current slug. On rename, retain the old slug as non-current and add a new current slug. Deleting the project deletes all its slugs; requests for those slugs then return 404.
- **Related requirements:** F-02, F-12, F-14

### Technology and project technology

- **Purpose:** Reuse technology names across projects and attach multiple technologies to each project.
- **Fields:** Technology has `id` and unique `name`; project-technology relationship has `project_id`, `technology_id`, and `sort_order`.
- **Constraints:** A technology can be attached to many projects; duplicate attachment to the same project is not allowed. Removing a project removes its relationships. Removing a technology is disallowed while attached unless the admin first removes those relationships.
- **Related requirements:** F-01, F-10

### Project media

- **Purpose:** Store project screenshot and GIF metadata; file bytes live in Supabase Storage.
- **Fields:** `id`, `project_id`, `storage_path`, `media_type` (still image or GIF), `mime_type`, `size_bytes`, `alt_text`, `sort_order`, `is_main`, and `created_at`.
- **Constraints:** JPG, PNG, and WebP are limited to 5 MB; GIF is limited to 10 MB. A project allows at most 10 still images and 2 GIFs. A database trigger checks the actual Storage object's MIME type and size and enforces per-project counts; Storage bucket limits provide an additional 10 MB maximum and MIME allowlist. Every item has non-empty alt text. At most one item per project is the main image; deleting the main item selects the next item when one remains. Files are stored and served as uploaded; the app does not compress or create variants. Failed cleanup paths are retained in `project_media_cleanup` for a manual retry. Project deletion removes current and queued Storage paths before deleting records.
- **Cleanup record:** `project_media_cleanup` stores `id`, `project_id`, `storage_path`, and `created_at` for replaced or rolled-back uploads that could not be removed. Only the designated administrator can access it; retry removes the object and then its record.
- **Related requirements:** F-04, F-11, F-14

### Contact method

- **Purpose:** Store public contact links and the contact email address used for notifications.
- **Fields:** `id`, `label`, `method_type` (`email` or `link`), `icon_key`, `value` (email address, HTTP(S) URL, or phone number), `is_enabled`, `sort_order`, `created_at`, and `updated_at`.
- **Constraints:** Exactly one Email method exists and stays enabled; its value is the public contact and notification address, independent of admin login. Migration `20261017000008_mailbox_and_contact_methods.sql` seeds the required Email row with an empty value so the owner can configure it in Mailbox before launch. It may be edited but not disabled or removed; a database trigger protects this invariant. Link methods select a built-in icon from the allowlist; the Phone icon requires a phone number with 7–15 digits, rendered as a `tel:` link; other methods require an HTTP(S) URL. Other methods can be enabled, disabled, reordered, or removed. The administrator saves the contact-method list transactionally with the designated-admin-only RPC. Render user-provided labels as plain text and validate destinations in the interface and database.
- **Related requirements:** F-06, F-17

### Visitor message

- **Purpose:** Store a message submitted from the public Contact form.
- **Fields:** `id`, `visitor_email`, `message_body`, `created_at`, `is_read`, `notification_status` (`pending`, `sent`, or `failed`), and optional `notification_attempted_at`.
- **Constraints:** Visitor email and message are required; email is limited to 254 characters and message body to 5,000 characters. The trusted contact Edge Function validates both. The message is saved before email is attempted. A notification failure does not change the saved message or visitor success state. Only the admin can read, update, or permanently delete messages. Do not store a name or subject; the form contains only email and message.
- **Sensitive data:** Visitor email and message body are private admin data. Do not expose them to public database queries or logs.
- **Related requirements:** F-06, F-18, F-19

## 3. Relationships

| Entity A | Relationship | Entity B | Rules |
| --- | --- | --- | --- |
| Project | One-to-many | Project slug | One current slug per project; delete slugs with project. |
| Project | One-to-many | Project media | Delete media metadata and stored files with project. |
| Project | Many-to-many | Technology | Via project-technology rows; delete relationships with project. |
| Profile | One-to-many | Work experience entry | Delete entries with the profile only if profile is ever made non-singleton. |
| Skill category | One-to-many | Skill | Each skill belongs to one category; a category may be deleted only when it contains no skills. |

Legacy Homepage content, Profile, administrator configuration, and the Email contact method are singleton records. Visitor messages and all editable content are owned by the one designated administrator.

## 4. Integrity and business invariants

- **INV-01:** All admin reads and writes are limited to the designated Supabase Auth user through database/storage policies or trusted server functions; hiding routes is not authorization.
- **INV-02:** Public content can be read without authentication. Visitor messages and administrator configuration are never publicly readable.
- **INV-03:** Every saved project appears in the Projects section in shared project order and has a public detail route. Project deletion permanently removes the project, media, technology relationships, and slug history.
- **INV-04:** Every project has exactly one current slug; all retained historical slugs redirect to that project.
- **INV-05:** Each project has at most 10 still images, 2 GIFs, and one main image; every image has alt text.
- **INV-06:** Exactly one enabled Email contact method exists and is the recipient for contact-message notifications.
- **INV-07:** A visitor message is committed before notification delivery is attempted; notification failure never deletes or hides the message.
- **INV-08:** All editable text is plain text and is never interpreted as HTML or script.
- **INV-09:** Every skill belongs to exactly one category. A category can be deleted only when empty; empty categories are omitted from About.

## 5. Indexes and query needs

| Data / query pattern | Index or optimization | Reason |
| --- | --- | --- |
| Projects in administrator order | Index on `sort_order` | The Projects section displays all projects in the same order as the admin list. |
| Project lookup by URL | Unique index on `slug`; partial unique index for one current slug per project | Resolve current and historical routes quickly and preserve uniqueness. |
| Project media by project/order | Index on `(project_id, sort_order)` | Load each gallery in display order. |
| Project technologies by project/order | Index on `(project_id, sort_order)` and unique `(project_id, technology_id)` | Render ordered technology tags without duplicates. |
| Skill categories in display order | Index on `sort_order` | Render category headings in administrator-defined order. |
| Skills in category order | Index on `(category_id, sort_order)` | Render each category's ordered skill bullet list. |
| Contact methods by enabled/order | Index on `(is_enabled, sort_order)` | Render enabled methods in configured order. |
| Messages newest first | Index on `created_at DESC` | Mailbox default ordering. |

Project name search can use a case-insensitive match at the expected small portfolio scale; add a specialized text index only if real usage warrants it.

## 6. Access and data lifecycle

- **Ownership / tenant boundaries:** One owner/admin. The admin Auth user ID is explicitly allowlisted in a protected configuration source. No public registration or multi-tenant data.
- **Public reads:** About Me content and CV metadata, skill categories and skills, projects, current/historical slugs, project media metadata/files, and enabled contact methods. The Home role, introduction, actions, and profile image are bundled with the app; Home content and the legacy profile photo path are not read from Supabase. Legacy homepage copy has no app read path.
- **Admin reads/writes:** All content management, contact methods, and messages are restricted to the designated administrator. Enabled contact methods are also publicly readable. The contact Email row invariant is enforced by the database trigger and unique index.
- **Visitor message writes:** Browser clients cannot insert directly. The contact Edge Function validates input and writes the message using trusted credentials; it then sends the Brevo notification and records the result.
- **File access:** Uploaded portfolio files are publicly readable because they appear on public pages. Only the designated admin can upload, replace, or delete them. Storage paths associate each file with exactly one profile or project item.
- **Retention/deletion:** Projects, project media, contact methods other than the required Email method, and messages are permanently deleted when the administrator deletes them. No archive, soft deletion, or automated database export is in scope. Project deletion is not reported successful until both Storage objects and database records are removed. If Storage removal fails, retain the project record, show an error, and allow a safe retry.
- **Audit history:** No general audit log is required. Historical project slugs are retained only to support redirects and are removed when the project is deleted.
- **Privacy:** Visitor email and message body are private and should not appear in logs. The public Email contact value is intentionally public and is not the admin login email.

## 7. Migrations and seed data

- **Migration approach:** Version schema, indexes, constraints, policies, and storage setup in ordered Supabase SQL migrations committed to the repository. Migration `20261017000001_all_projects_ordered_publicly.sql` removes the obsolete `is_featured` project field and its index; every project is public in shared admin order. Project saves use the designated-admin-only transactional RPC in migration 20261017000002_admin_project_editor.sql to keep project fields, technology links, and current/historical slugs consistent. Migration `20261017000008_mailbox_and_contact_methods.sql` adds administrator-only visitor message access, public reads of enabled contact methods, and a transactional administrator contact-method save RPC. Migration `20261017000009_contact_method_icons.sql` adds administrator-selected contact icons and phone contact destinations.
- **Seed data:** Local development may use clearly fictional projects and messages. Production must not receive demo visitor messages or a fake public contact address. Provision the designated Auth user and required Email contact method through documented setup before launch.
- **Compatibility / rollback:** Review migrations before applying to production. Prefer additive changes; document any migration that could remove or transform owner content. The obsolete `is_featured` values are dropped; this does not delete project content. Backups/exports are not part of this version.

## 8. Example records

Omitted for this draft. Add fictional examples after the field and constraint decisions are reviewed.

## 9. Open schema questions

- None currently. Do not add product-level text-length caps outside the visitor contact form. Revisit only if a concrete implementation or service constraint requires a limit.
