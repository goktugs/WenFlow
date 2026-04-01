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
