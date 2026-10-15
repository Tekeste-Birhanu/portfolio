# AI Agent Instructions

## 1. Mission

Build the **Developer Portfolio** according to the approved requirements and existing codebase. Prefer correct, maintainable, secure, and testable solutions over the fastest-looking implementation.

## 2. Read the relevant context

Before making changes, inspect the repository and read the documents relevant to the task:

- `docs/PRD.md` - product goals, scope, and acceptance criteria
- `docs/APP_FLOW.md` - journeys, screens, and interaction states
- `docs/DESIGN.md` - visual and interaction conventions
- `docs/ARCHITECTURE.md` - system boundaries and technical decisions
- `docs/SCHEMA.md` - data structures and invariants
- `docs/TASKS.md` - task order, dependencies, and completion status
- `README.md` - setup and commands

Do not assume a document applies where the project does not use that capability. Follow repository-specific instructions as well.

## 3. Working rules

- Inspect existing code before proposing or implementing changes.
- Work on one well-defined task at a time; avoid unrelated refactors.
- Follow established patterns and the architecture unless there is a clear reason to change them.
- Prefer simple, readable solutions over unnecessary abstractions or dependencies.
- Do not invent product behavior when requirements are unclear. Record the ambiguity and ask for a decision if it materially affects scope, data, security, or user experience.
- Treat user input and external data as untrusted.
- Never expose secrets, credentials, private data, or sensitive values in code, logs, tests, or documentation.
- Do not claim a task or test passed unless it was actually verified.
- Do not overwrite user changes or perform destructive operations without permission.

## 4. Implementation expectations

- Keep components, modules, and functions focused.
- Validate data at appropriate boundaries.
- Enforce authorization on the server or trusted backend, not only in the UI.
- Handle loading, empty, success, validation, and error states where relevant.
- Use accessible semantic elements and keyboard-friendly interactions.
- Add or update tests for changed behavior and important edge cases.
- Update documentation when behavior, architecture, schema, setup, or decisions change.

## 5. Verification

Before marking a task complete:

1. Check its acceptance criteria in `docs/TASKS.md` and relevant requirements.
2. Run applicable tests, linting, type checks, and build commands available in the project.
3. Review the diff for regressions, accidental files, secrets, and unrelated changes.
4. Report what changed, what was verified, and anything not verified.

If a check cannot be run, state why. Do not silently substitute an assumption for a passing result.

## 6. Documentation and conflicts

- Keep documentation aligned with the implemented system.
- Use stable IDs such as `F-01`, `J-01`, and `T-01` when linking requirements, journeys, and tasks.
- If documents conflict, identify the conflict. Prefer an explicit approved decision over an outdated or inferred statement; ask for clarification when the conflict is consequential.
- Keep `docs/TASKS.md` status current, but do not mark work complete until its checks pass.

## 7. Project-specific instructions

- **Application stack:** Plain JavaScript, React with Vite, Supabase Database/Auth/Storage/Edge Functions, Cloudflare Pages, and Brevo transactional email. Do not substitute services or add paid dependencies without an approved decision.
- **Package manager / runtime:** npm with Node.js 24.20.0 (Node 24.x). Keep `package-lock.json` committed and use `npm.cmd ci` in PowerShell for clean installs.
- **Required commands:** In PowerShell use `npm.cmd ci`, `npm.cmd run dev`, and `npm.cmd run build`; these are verified during `T-02`. Apply repository migrations to the linked hosted Supabase project with `npm.cmd run db:push`; the remote link and dry-run are verified. Actual migration application will be checked when a schema migration is created and reviewed.
- **Additional constraints:** Follow approved behavior in `docs/PRD.md` and `docs/ARCHITECTURE.md`. Authorization must be enforced by Supabase policies or trusted functions; only the designated administrator may access admin data; keep secrets out of the browser; validate public input at trusted boundaries; do not add unapproved features or services.
