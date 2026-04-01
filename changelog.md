# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-04-01

### Added
- JWT-based authentication with registration, login, session restoration, and protected routes.
- User-specific workspaces with document ownership isolation.
- Document management flow for creating, listing, renaming, soft deleting, and restoring documents.
- Sidebar-driven document navigation with active and trash views.
- Rich text editing with Tiptap, including headings, paragraphs, bullet lists, and code blocks.
- Slash commands for quickly inserting supported block types.
- Real-time collaborative editing powered by Hocuspocus and Yjs.
- Presence indicators showing active collaborators connected to a document.
- Document version history with version listing and restore support.
- PostgreSQL persistence through Prisma migrations and schema management.
- Docker-based local development setup for web, API, collaboration, and database services.

### Changed
- Improved document screen error handling and Docker configuration for smoother local setup.
- Persisted collaboration state alongside document content for real-time session recovery.

### Notes
- This release focuses on the core collaborative editing workflow and workspace foundations.
- Some advanced assignment bonus features, such as activity feed, sharing, and offline-first sync, are not included in this release.

## [0.2.0] - 2026-04-02

### Added
- Password-protected share links for joining collaborative documents from a direct URL.
- Shared document memberships for cross-user collaboration beyond the document owner.
- Colored live cursors and selections for each collaborator.
- Presence status tracking that distinguishes between viewing and editing states.
- Manual "Save version" action alongside automatic periodic version snapshots.
- Read-only sharing mode with owner-controlled share permissions.
- Share mode controls in the collaboration panel with editable vs read-only indicators.
- Workspace tabs for My Docs, Shared With Me, and Trash.
- Loading feedback with shadcn spinner components across auth, documents, versions, and editor states.

### Changed
- Refined the document layout by splitting the main document shell into focused sidebar, detail, and share dialog components.
- Moved frontend auth and document state management to Zustand.
- Upgraded the share flow to support direct-link joining with a 4-digit password dialog.
- Improved slash command UX with floating in-editor positioning near the caret.
- Made document title edits preview instantly across the header, input, and sidebar list before rename is submitted.
- Updated the collaboration model so owners can switch between editable and read-only sharing.
- Adjusted collaborator disconnect behavior so access loss clears the current selection without auto-focusing another document.
- Simplified the authentication screen to a centered card layout.

### Notes
- This release expands the assignment coverage around sharing, multi-user collaboration, workspace UX, and versioning polish.
- Offline support and a real-time activity feed are still not included.
