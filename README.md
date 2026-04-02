[README.md](/Users/goktug/Desktop/projects/WenFlow/README.md)

```md
# WenFlow

## Summary

WenFlow is a small collaborative note-taking app built for this assignment. The goal was to cover the core product loop well rather than spread effort across too many extras: document management, a block-based editor, real-time collaboration, version history, and user-isolated workspaces. I split the app into a React frontend, an Express API, and a separate collaboration server so the real-time editing flow could stay isolated from the standard REST API concerns.

## How does the code work?

The project is organized as a monorepo with three main apps:

- `apps/web`: the React client
- `apps/api`: the HTTP API for auth, documents, and versioning
- `apps/collab`: the WebSocket collaboration server

The web app handles the editor UI, document navigation, auth flow, and collaboration presence. The API handles registration, login, document CRUD, soft delete / restore, and document version history. The collaboration server handles live editing sessions and presence updates.

For persistence, PostgreSQL is used through Prisma. User accounts, documents, sharing state, and version history are stored in the database. JWT is used to identify the current user and keep each workspace isolated.

For collaborative editing, I used Yjs with Hocuspocus. That lets multiple users edit the same document without overwriting each other’s changes. The editor content is synchronized through the collaboration server, while document metadata and version history remain in the API/database layer.

## How do I set up and run the project?

### Prerequisites

- Node.js 24
- npm
- PostgreSQL

### Environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/wenflow
API_PORT=4000
COLLAB_PORT=4001
WEB_PORT=5173
JWT_SECRET=your-secret
VITE_API_URL=http://localhost:4000/api/v1
VITE_COLLAB_URL=ws://localhost:4001
```

### Install dependencies

```bash
npm ci
npm run prisma:generate --workspace @wenflow/api
```

### Run migrations

```bash
npm run prisma:migrate --workspace @wenflow/api
```

### Start the services

Run each service in a separate terminal:

```bash
npm run dev:api
```

```bash
npm run dev:collab
```

```bash
npm run dev:web
```

### Local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:4000/api/v1`
- Collaboration server: `ws://localhost:4001`

### Docker

For local development with Docker:

```bash
npm run docker:up
```

## What design decisions did you make?

I kept the collaboration server separate from the REST API. Real-time editing and presence have different runtime behavior than normal CRUD endpoints, so keeping them apart made the system easier to reason about and easier to extend.

For sync, I chose a CRDT-based approach with Yjs instead of building a custom OT system. That was the safest choice for concurrent editing in the time available. The tradeoff is extra moving parts, but the editing behavior is much more reliable under simultaneous updates.

I also treated version history as a first-class backend concern instead of relying only on the current editor state. That made restore functionality straightforward and gave the project a better recovery story.

On the product side, I prioritized the main assignment requirements over broader polish. I spent more time making the core flows work together than adding extra surface-level features.

## Which assignment requirements are implemented?

### 1. Document Management

Implemented.

- Create documents
- Rename documents
- Soft delete documents
- Restore deleted documents
- Show documents in a sidebar

### 2. Rich Text Editor

Implemented.

- Headings
- Paragraphs
- Bullet lists
- Code blocks
- Slash commands
- Debounced autosave

### 3. Real-time Collaboration

Implemented.

- WebSocket-based collaboration backend
- Concurrent editing without users overwriting each other
- Presence indicators for connected users

### 4. Document Versioning

Implemented.

- Persisted version history
- Restore previous versions

### 5. User-Specific Workspaces

Implemented.

- JWT authentication
- Per-user workspace isolation

## Which bonus features are included?

Partially included.

- Conflict-free real-time sync: yes, using Yjs/CRDT
- Document sharing: partially included through collaboration access flow
- Read-only collaboration mode: yes

Not implemented:

- Offline support
- Real-time activity feed

## What would you do next with more time?

- Add offline editing and queued sync on reconnect
- Add automated tests for API and collaboration flows
- Improve the sharing model and permission handling
- Add a proper activity feed
- Tighten the production deployment setup and runtime configuration

## Which AI tools did you use and for what purpose?

I used cursor for implementation support, debugging, and deployment troubleshooting. In practice that meant using them to speed up repetitive code, compare possible approaches, and sanity-check issues across the frontend, API, and collaboration layers.

## Where were AI suggestions helpful and where did they fall short?

They were helpful when the task was mechanical or exploratory, especially for scaffolding, debugging directions, and catching integration issues quickly. They were less helpful when the answer depended on the exact structure of this repo or on deployment/runtime behavior, where generic suggestions tended to be too broad.

## Which AI outputs did you override or correct, and why?

I overrode suggestions that were too template-like, did not fit the actual monorepo structure, or assumed a simpler deployment model than this project uses. I also rewrote generated documentation and setup guidance when it sounded generic instead of reflecting the actual implementation choices in this codebase.
```
