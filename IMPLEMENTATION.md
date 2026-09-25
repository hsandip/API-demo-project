# Implementation Notes

This document describes what has been built in this project: the stack, the
data flow for each feature, how to run it locally, and the reasoning behind
a few non-obvious decisions. It also records a full audit that was run
against the codebase and the fixes applied as a result, followed by a log of
feature changes made afterward.

## Stack

- **React 19 + TypeScript + Vite**
- **React Router v7** for routing (`/login`, `/dashboard`, catch-all 404)
- **Axios** for all HTTP calls, isolated in `src/api/*` — components never call
  `axios`/`fetch` directly
- **TanStack Query** (`@tanstack/react-query`) — being introduced incrementally
  to take over data-fetching/caching/mutation state from the manual
  `useState`/`useEffect` hooks (`useUsers.ts`, etc.). Axios stays the actual
  HTTP client; TanStack Query only orchestrates when/how often it's called
  and caches the results. See "Recent feature changes" for progress.
- **Express + TypeScript** (`server/`) as the local REST API backing the
  Users CRUD table and image/document storage — replaces the former
  json-server setup. See "Backend: Express API (`server/`)" below.
- **Vitest** for unit tests
- **Tailwind CSS v4 + shadcn/ui** for all styling — every interactive
  element (`Button`, `Input`, `Label`, `Select`, `Dialog`, `AlertDialog`,
  `Table`, the sonner-backed `Toaster`) is a shadcn/ui component styled via
  Tailwind utility classes directly in JSX. `src/index.css` contains only
  the Tailwind bootstrap and the shadcn theme token block (light/dark via
  `prefers-color-scheme`) — no bespoke component CSS classes exist anywhere
  in the project. See "Styling: full migration to Tailwind + shadcn/ui"
  below.

## Running the project

Two processes are required in development:

```bash
pnpm install
pnpm dev      # Vite dev server, http://localhost:5173
pnpm server   # Express API (server/), http://localhost:4000, backed by Supabase
```

`pnpm server` requires a Supabase project — see "Migrating off json-server"
below for one-time setup.

`pnpm build` / `pnpm preview` still only cover the frontend — `pnpm server`
must be running separately for any of the Users or Upload features to work
against a real backend. `pnpm test` runs the Vitest suite.

The migration off json-server is complete: the root `db.json`,
`patches/json-server.patch`, the `json-server` dependency, and the
`pnpm server:legacy` script have all been removed. The Express API in
`server/` is the only local backend now — and it in turn no longer keeps
its own data in a JSON file; it stores everything in Supabase (hosted
Postgres). See "Migrating off json-server" below for one-time setup.

## Backend: Express API (`server/`)

A standalone Node/Express workspace package (added as a pnpm workspace
member alongside the frontend) that replaces json-server as the local REST
backend, while keeping the exact same endpoint paths and response shapes
(`/users`, `/images`, the same `_page`/`_per_page`/`_sort`/`_where`
query-string contract and paginated `{ first, prev, next, last, pages,
items, data }` response shape) so the frontend's service layer
(`src/services/user.service.ts`, `src/services/upload.service.ts`) needed no
code changes — only `VITE_LOCAL_API_URL` moved from port 3001 to 4000.

```
server/
  src/
    config/env.ts        Loads + validates env vars (PORT, HOST, CORS_ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    lib/
      ApiError.ts          Typed HTTP error (status + message), thrown by services
      asyncHandler.ts       Forwards rejected promises to Express's error middleware
      supabaseClient.ts       Server-side Supabase client (service_role key — bypasses RLS)
      queryHelpers.ts         buildPagedResult/applyWhereFilter/parseWhere — json-server-compatible list semantics, translated to PostgREST filters
    middleware/
      errorHandler.ts        Central error handler (ApiError, ZodError, and generic 500s) + 404 handler
      validate.ts              validateBody(schema) — parses/replaces req.body via a Zod schema
    modules/
      users/                  routes, controller, service, Zod validation schemas, types
      images/                 same layering, for image/document upload + delete
    routes/index.ts          Mounts /health, /users, /images
    app.ts                    Express app: helmet, cors, morgan, express.json({ limit: '10mb' }), routes, error handling
    server.ts                 Entry point — starts the HTTP listener
  supabase/schema.sql        SQL to create the users/images tables (run once in the Supabase SQL Editor)
  scripts/migrate-json-to-supabase.mjs   One-off importer for the old data/db.json into Supabase
```

- **Data store**: Supabase (hosted Postgres), accessed via `@supabase/supabase-js`
  in `lib/supabaseClient.ts`, authenticated with the `service_role` key —
  the file-backed `data/db.json`/`lib/jsonStore.ts` store has been removed.
  Tables are created from `server/supabase/schema.sql`; column names are
  camelCase (quoted identifiers) so the API's JSON shape needed zero mapping
  code. See "Migrating off json-server" below for setup and data-migration
  steps.
- **List queries**: `_where`'s `eq`/`contains`/`or` clauses (see
  `queryHelpers.ts`'s `applyWhereFilter`) are translated to PostgREST filters
  (`.eq()`/`.ilike()`/`.or()`) instead of being evaluated in memory, and
  pagination/sorting use Supabase's `.range()`/`.order()` with an exact
  `count`, rather than slicing an in-memory array.
- **User ids**: a client-supplied `id` (see `usersApi.create`'s
  `randomNumericId()`) is honored if it doesn't collide with an existing
  row (checked with a query before insert); otherwise the server generates
  one — the same contract the old json-server patch used to provide.
- **Validation**: Zod schemas per module (`users.validation.ts`,
  `images.validation.ts`), applied via `validateBody`/`schema.parse` in each
  controller. A failed validation surfaces as a `400` with a
  `{ message, details }` body (`details` is a list of `{ path, message }`).
- **Errors**: every 4xx/5xx response is `{ message }` (plus `details` where
  relevant) — matching the shape `toApiError()` in the frontend's
  `src/lib/axios.ts` already expects, so no frontend error-handling changes
  were needed either.
- **CORS**: configured via `CORS_ORIGIN` (comma-separated list), defaulting
  to `http://localhost:5173`.
- **Auth is unaffected**: login/password-reset still go straight to the real
  DummyJSON API via `httpClient` (`src/services/auth.service.ts`) — this was
  already independent of json-server and stays independent of the new
  Express API, which only serves `/users` and `/images`.
- **Deployment**: `render.yaml`'s API service now runs
  `pnpm run server:build && pnpm run server:start` (compiles then runs
  `server/dist/server.js`) instead of json-server. `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` are set as `sync: false` secrets there.

### Setting up Supabase (one-time)

1. Create a free project at [supabase.com](https://supabase.com).
2. In its SQL Editor, run `server/supabase/schema.sql` to create the `users`
   and `images` tables.
3. From Project Settings -> API, copy the Project URL and the
   `service_role` secret key into `server/.env`:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. If you have existing data in `server/data/db.json` from before this
   migration, run `pnpm --filter server migrate:data` once to copy it into
   Supabase (upserts by id, safe to re-run). Once confirmed, delete
   `server/data/db.json` — nothing in the running server reads it anymore.
5. `pnpm server` now talks to Supabase instead of a local file.

The `service_role` key bypasses Row Level Security and must stay
server-side only — it's read from `server/.env` (gitignored) and is never
sent to or used by the frontend.

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL for **login only** (`https://dummyjson.com`) — a real external API used purely for its demo auth endpoint. |
| `VITE_LOCAL_API_URL` | Base URL for the local Express API in `server/` (`http://localhost:4000`). Used by **both** the Users CRUD API and the image/document upload API. |

Both are validated at module-load time in `src/api/client.ts` — a missing or
misnamed variable throws immediately with a clear message instead of
surfacing later as a confusing network failure. There is no API key or
secret required anywhere in this project.

## Authentication

- `src/services/auth.service.ts` calls `POST {VITE_API_BASE_URL}/auth/login`
  against the real DummyJSON API (demo credentials: `emilys` / `emilyspass`).
- **Token storage was hardened** (`src/features/auth/tokenStorage.ts`):
  - The **access token is kept in an in-memory module variable only** — it is
    never written to `localStorage`, so it doesn't survive a reload and isn't
    readable by an XSS payload scanning browser storage.
  - The **refresh token is still persisted in `localStorage`**, since
    DummyJSON is a third-party demo API and can't set a real httpOnly cookie
    for this origin (an in-code comment explains this trade-off).
  - `src/features/auth/AuthContext.tsx` performs a **silent refresh on boot**:
    it re-mints an access token from the stored refresh token on mount, so a
    page reload doesn't force the user back to `/login`.
  - `src/lib/axios.ts`'s Axios response interceptor **auto-refreshes on a
    `401`**, with a single shared in-flight refresh promise so concurrent
    401s don't each trigger their own refresh call, then retries the original
    request.
  - A failed refresh clears auth state and shows a "session expired" toast,
    via `src/features/auth/authEvents.ts` + `AuthContext.tsx`.
  - This is **not** httpOnly-cookie-based auth (that would require the auth
    server itself to set the cookie, which DummyJSON doesn't support) — the
    real improvement over the original design is that the long-lived access
    token no longer sits in `localStorage` at all.
- `src/features/auth/AuthContext.tsx` + `useAuth.ts` expose `isAuthenticated`,
  `user`, `login`, `logout` app-wide. `AuthUser.authId` is DummyJSON's numeric
  session id, deliberately named differently from `User.id` since the two are
  unrelated ID domains.
- `src/features/auth/ProtectedRoute.tsx` redirects to `/login` when not
  authenticated; wraps the `/dashboard` route in `App.tsx`.
- `src/lib/axios.ts`'s `httpClient` attaches `Authorization: Bearer <token>`
  to every request automatically via an Axios request interceptor.
- The dashboard header shows the signed-in user: `DashboardPage.tsx` renders
  `Signed in as {currentUser.username}` using `currentUser` from `useAuth()`
  — there is no separate Header/Layout component, it's inline in the page.

This auth flow is intentionally **not** connected to the Express/Supabase
API — that backend has no auth support, so login continues to hit the real
DummyJSON API while everything else (Users CRUD, uploads) runs against the
local Express server described above.

## Users CRUD (`/users` on the Express/Supabase API)

- **Backend**: the `users` table in Supabase, served by the Express API in
  `server/` on port 4000 (see "Backend: Express API" above) — no longer
  json-server/`db.json`.
- **Service layer**: `src/services/user.service.ts` (`usersApi.list/getById/
  create/update/patch/remove`), using a dedicated Axios instance
  (`localApiClient` in `src/lib/axios.ts`). `update`/`patch` run inputs
  through `nullifyUndefined()` first — see the "cleared field" fix below.
- **UI**: `src/pages/DashboardPage.tsx` orchestrates state via the
  `useUsers` hook and calls the service layer; `src/components/UserTable.tsx`
  renders the table (with "Photo" and "Document" columns, see below, and
  clickable-header column sorting — see "Search, filter, sort, pagination"
  below); `src/components/UserFormModal.tsx` is the create/edit form,
  rendered as a shadcn `Dialog` (supports both a full `PUT` save and a
  diff-only `PATCH` save of just the changed fields);
  `src/components/ConfirmDialog.tsx` (a shadcn `AlertDialog`) gates deletion.
- **Verified real REST semantics**: `GET /users`, `GET /users/:id`,
  `POST /users`, `PUT /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` all
  round-trip through the actual local server and persist to Supabase
  (checked directly, not just via React state).
- **`User.id` is `string`**, and is now a **random unique 4-digit numeric
  string generated client-side** (e.g. `"4827"`). See "ID generation" below
  for the history of this (originally worked around a json-server quirk;
  the Express API honors a client-supplied `id` natively — see "Backend:
  Express API" above).
- **`User.image` (optional `string | null`)** holds the uploaded profile
  image's public URL, set via the Profile Image field in the Add User/Edit
  User modal (see "Uploads" below). Rendered as a small avatar in
  `UserTable`'s "Photo" column, or a placeholder person icon when absent.
- **`User.document` (optional `UserDocument | null`)** holds the uploaded
  document's `{ url, name, mimeType, size }`, set via the Document & File
  Upload field in the same modal. Rendered in `UserTable`'s "Document" column
  as a clickable, truncated filename link, or an em dash when absent.
- The initial `GET /users` on mount is cancelled via `AbortController` if
  `DashboardPage` unmounts before it resolves; clicking "Edit" on a row is
  guarded by a request token so a fast second click can't let a stale
  response overwrite the modal with the wrong user's data (`UserTable` also
  disables every Edit/Delete button while any edit-fetch is in flight, as a
  second layer).
- **Loading state only gates the first load.** `useUsers.ts` tracks whether
  data has ever loaded (`hasLoadedOnceRef`) and dedupes identical filter
  changes (`filtersEqual`), so changing a filter/sort/page no longer
  re-shows the full-page "Loading users…" spinner and flashes the table —
  only the very first load does that.

## Search, filter, sort, pagination

The Users table supports server-side search, gender filtering, column
sorting, and pagination — all driven through the same `_page`/`_per_page`/
`_sort`/`_where` query contract on the Express API (see "List queries" in
the Backend section above):

- **UI**: `src/components/UsersToolbar.tsx` — a free-text search `Input`, a
  gender filter `Select`, and a rows-per-page `Select`. Column sorting is via
  clickable headers in `UserTable.tsx`, wired through `onSort`/`toggleSort`
  in `src/hooks/useUsers.ts`. `src/components/PaginationControls.tsx` renders
  page navigation, driven by `DashboardPage.tsx`.
- **Query building**: `src/services/user.service.ts`'s `buildUserListQuery`
  builds `_page`, `_per_page`, `_sort` (`-`-prefixed for descending), and a
  `_where` object — an `eq` clause for the gender filter, and an `or` of
  `contains` clauses across `SEARCHABLE_FIELDS` for the free-text search.
- **Server**: `users.controller.ts` parses these via `queryHelpers.ts`
  (`parseWhere`/`applyWhereFilter`/`buildPagedResult`) and translates them to
  PostgREST filters/`.range()`/`.order()` calls against Supabase, returning
  the same paginated `{ first, prev, next, last, pages, items, data }` shape
  the frontend already expected.

### ID generation

`usersApi.create` (`src/api/users.ts`) generates the new user's `id`
client-side: `randomNumericId()` fetches the current user list, then rolls a
random 4-digit number (`1000`–`9999`), re-rolling on collision, and sends it
explicitly in the `POST` body.

This alone wasn't enough. json-server v1.0.0-beta.15's `Service#create()`
(`lib/service.js`) **unconditionally discards any `id` in the request body**
— `const item = { ...data, id: randomId() }` always calls its own random-id
generator, regardless of what the client sent. Every earlier attempt at
custom ID generation (sequential, then random-numeric) silently failed for
this reason: the frontend computed the right id, and the server threw it
away and substituted its own random alphanumeric string (e.g.
`"luJPr1kxQZo"`) instead.

Fixed with a second hunk in the existing `patches/json-server.patch` (see
"json-server patches" below): `create()` now honors a caller-supplied `id`
when it's a non-empty string that doesn't collide with an existing record,
falling back to its own `randomId()` only when the id is missing or already
taken. This is what actually makes `usersApi.create`'s random numeric ids
take effect, and it doubles as a second layer of collision safety (the
client already avoids collisions against the list it fetched, but the server
check covers anything created between that fetch and this write).

Edit/Delete are unaffected by id format — both interpolate `id` directly into
the URL path (`/users/${id}`), so they work identically for the original
seed users (`"1"`, `"2"`, `"3"`) and for new random-numeric-id users.

## Uploads (Profile image + Document & File Upload)

Both upload fields live **inside the Add User/Edit User modal**
(`UserFormModal.tsx`) — Profile image above First Name, Document & File
Upload directly below the Age/Gender row. Both read and write the **same**
`/images` endpoint on the Express API, via the same service layer
(`src/services/upload.service.ts` → `uploadApi.uploadImage` /
`uploadApi.deleteImage`) and the same shared hook
(`src/hooks/useImageUpload.ts`). There is no external image host involved
(ImgBB/Imgur were evaluated and rejected — see "Design decisions" below).

Files are now stored in **Supabase Storage** (bucket `uploads`), not as
base64 in the database — see `server/src/modules/images/images.service.ts`.
The `images` table row's `dataUrl` column holds the file's public Storage
URL (kept under that column name for backward-compatible response shape,
even though it's no longer a base64 data URL). Deleting an image also
removes the Storage object (`storagePathFromPublicUrl`).

> Earlier in this project's history there were three separate upload
> surfaces on the dashboard itself ("Image Upload Demo", a standalone "File
> Drop Zone", and a standalone "Profile Image Upload" section). All three
> have since been removed or folded into the two fields described here —
> see "Recent feature changes" for the trail.

### How an upload works

1. The selected `File` is read client-side into a base64 data URL
   (`FileReader.readAsDataURL`).
2. `POST {VITE_LOCAL_API_URL}/images` is sent with
   `{ originalName, dataUrl, mimeType, size }` as a JSON body; the Express
   API uploads the decoded file to Supabase Storage and persists a record
   (with the Storage public URL) to the `images` table.
3. The response `id`/`mimeType`/`size` are kept alongside the record; the
   returned public URL (as `location`) is used directly as the `<img src>`
   (or stored on `User.image` / `User.document.url`) for display — no
   separate "fetch the file back" step is needed.
4. Deleting calls `DELETE {VITE_LOCAL_API_URL}/images/:id`, which removes
   both the Storage object and the database record.

### `useImageUpload` — the shared hook behind both upload fields

`src/hooks/useImageUpload.ts` owns validation, the
`idle → uploading → success/error/deleting` state machine, toast wording
(customizable per caller via the `entityLabel` option — "Image" vs "File"),
and object-URL lifecycle (revoking the previous URL on re-select/clear **and**
on unmount) in one place. Each consumer only supplies its own markup/drag-
and-drop wiring around the hook's returned state and actions (`selectFile`,
`upload`, `clear`).

Validation itself (file type + max size) lives even further down, in
`src/utils/fileValidation.ts` (`validateFile`, `formatFileSize`,
`getFileTypeLabel`, `truncateFileName`) — covered by unit tests in
`fileValidation.test.ts`.

### The two upload fields (same interaction pattern)

Both fields follow the same UX, mirroring each other exactly:

| Field | Component | Accepts | Behavior |
|---|---|---|---|
| Profile image | `ProfileImageField.tsx` | JPG/PNG, 5MB max | Small (96×96) avatar box. Selecting a file uploads immediately (no separate Upload button). A ghost pencil (✎) icon beside the box lets you replace it. |
| Document & File Upload | `DocumentFileUploadSection.tsx` | PDF/DOC/DOCX/TXT, 10MB max | Full-width, compact (52px tall) dropzone. Selecting a file uploads immediately. A ghost pencil (✎) icon at the right end lets you replace it. |

Neither field shows a manual "Upload" or "Remove" button — auto-upload on
selection plus a single replace icon is the whole interaction. Both fields'
result gets written into the form's `image`/`document` value via an
`onChange` callback (same `value`/`onChange`/`onNotify`/`disabled` prop
shape on both components), so it's included in the `Create`/`Save` call and
persists on the user record — visible afterward in `UserTable`'s Photo and
Document columns, and still there after a full page reload.

`DocumentFileUploadSection.tsx` used to be split into a container plus a
separate reusable presentational component (`DocumentFileUpload.tsx`, with a
large drag-and-drop card, an inline "Upload" button, and a result card with
Replace/Remove buttons). That split and that design are gone — the component
was rewritten to mirror `ProfileImageField`'s structure directly (single
file, auto-upload effect, `value`/`onChange` props), and the old file was
deleted rather than left behind unused.

### `json-server` patches

Two independent fixes to the installed `json-server` package, both applied
as hunks in the single `patches/json-server.patch` file (registered via
`pnpm.patchedDependencies` in `pnpm-workspace.yaml`, so `pnpm install`
reapplies both automatically — neither is a manual, one-off edit to
`node_modules`):

1. **Payload size** (`lib/app.js`). json-server's built-in JSON body parser
   (`milliparsec`) has an undocumented, hardcoded **100KB** request body
   limit. Since a base64-encoded image/document is ~33% larger than the
   original file, even a few-hundred-KB file would exceed it and every
   upload would fail with a `500` (`Payload too large`). Raised to 10MB:
   `app.use(json({ payloadLimit: 10 * 1024 * 1024 }))`.
2. **Honor a supplied `id` on create** (`lib/service.js`). See "ID
   generation" above — `create()` otherwise always overwrites the request
   body's `id` with its own random generator, which silently broke every
   attempt at custom (sequential or random-numeric) user IDs.

## Two real bugs found and fixed this session

Both surfaced as the same user-visible symptom — "the Add User modal closes
when I select a file" — but had two entirely unrelated root causes.

### 1. Vite's dev server was reloading the whole page on every upload

`db.json` lives inside the Vite project root. json-server writes to it
synchronously on every `POST`/`DELETE /images`. Vite's dev-server file
watcher was picking up that write and issuing a full client-side page
reload — indistinguishable from "the modal closed," except it was actually
the *entire SPA* remounting from scratch, wiping all React state including
the open modal. Confirmed by proving that touching `db.json`'s mtime alone
(with no file input involved at all) triggered the reload, and that this
did **not** happen for other files in the project root, isolating it to the
upload flow specifically writing that one file.

**Fix**: `vite.config.ts` now tells Vite's watcher to ignore it —
`server: { watch: { ignored: ['**/db.json'] } }`.

### 2. Radix Dialog's outside-interaction dismissal

A native OS file picker returns focus to the `<input type="file">` right
after it closes. If that input is disabled at that exact moment (or the
Radix `Dialog` sees a pointer-down/interact event it interprets as
"outside"), it reads that as focus having left the modal and dismisses it.
Two defenses are in place for this, both load-bearing and both documented
in-code where they live:

- `UserFormModal.tsx`'s `DialogContent` has `onPointerDownOutside` and
  `onInteractOutside` both calling `event.preventDefault()`.
- Neither `ProfileImageField.tsx`'s nor `DocumentFileUploadSection.tsx`'s
  file `<input>` uses the native `disabled` attribute — only
  `aria-disabled`, with `openFileDialog()` guarding re-opening the picker
  while busy instead. This applies to both the main dropzone input and each
  field's "replace" input.

## Styling: full migration to Tailwind + shadcn/ui

The project used to have ~450 lines of bespoke component CSS in
`src/index.css` (`.dropzone*`, `.avatar-box*`, `.field*`, `.dashboard*`,
`.table-wrapper`/`.table-avatar*`, `.upload-section`/`.upload-progress*`,
`.error-page*`, `.modal-actions`, plus global `h1`/`h2`/`code` element
styling) sitting alongside shadcn/ui components. All of it has been removed
and rebuilt as Tailwind utility classes directly in each component's JSX —
`LoginPage`, `NotFoundPage`, `ErrorBoundary`, `ErrorPage`, `DashboardPage`,
`UserTable`, `UserFormModal`, `ProfileImageField`,
`DocumentFileUploadSection`.

`src/index.css` is now ~80 lines: the Tailwind `@import`, the `dark` custom
variant, and the shadcn theme token block (`:root` / `@media
(prefers-color-scheme: dark)` / `@theme inline`) that maps the app's purple
accent palette onto shadcn's `--primary`/`--destructive`/`--border`/etc.
tokens — this block is required infrastructure for shadcn components to
render the app's intended palette rather than shadcn's default zinc theme,
not bespoke component styling, so it stayed. Two CSS variables that turned
out to be entirely dead (`--row-hover`, `--border-input` — defined but never
consumed anywhere, even by the old custom CSS) were dropped during the
cleanup.

Every native `<input>` in the project — including the `type="file"` inputs
in `ProfileImageField` and `DocumentFileUploadSection` — now goes through
shadcn's `Input` component (`@/components/ui/input`) rather than a bare
`<input>` element; `Input` already ships `file:*` Tailwind classes for
exactly this case. There are no native `<button>`, `<select>`, checkbox, or
radio elements anywhere in the app — every one already went through (or now
goes through) the matching shadcn/ui primitive. The `Dialog`/`AlertDialog`
components' own file-picker refs (`inputRef`, `replaceInputRef`) still
resolve correctly through the plain (non-`forwardRef`) `Input` function
component, since React 19 supports `ref` as a normal prop on function
components.

`UserFormModal`'s `DialogContent` also gained `max-h-[85vh] overflow-y-auto`
(scoped to that component's only consumer of the base `Dialog`, so it didn't
need to become a global change) after the modal grew tall enough — once the
Document field, the Photo field, and the Age/Gender row are all present at
once — to be cut off at the bottom of the viewport with no way to reach
Create/Cancel.

## Design decisions worth knowing

- **Why not Imgur/ImgBB?** Both were evaluated for the original "Image
  Upload Demo" requirement (real upload + real delete API, free, browser
  CORS support). Imgur is the only free host with both genuine CORS support
  and a real callable `DELETE` endpoint; ImgBB's "delete" is a human-facing
  web page on a different origin with no CORS headers, so it can't be called
  from `fetch`/`axios` or have its result verified. The project ultimately
  moved to a local json-server-backed store instead, which sidesteps external
  API keys entirely and keeps both upload and delete fully real and
  verifiable.
- **Base64-in-JSON image/document storage**: chosen for simplicity — no
  file-system upload endpoint needed, works entirely through json-server's
  existing REST semantics. Trade-off: `db.json` grows by ~1.33× the original
  file size per upload, and everything is loaded into memory on every `GET`.
  Acceptable for a local demo; would need real object storage (S3-like) for
  anything beyond that.
- **`localApiClient` is shared** between Users and uploads, via
  `VITE_LOCAL_API_URL` — one json-server instance backs both.
- **Both upload fields auto-upload on selection**, with only a replace icon
  and no manual Upload/Remove buttons — a deliberate UI simplification made
  when the Document field was rebuilt to match the Profile image field, so
  the two fields behave identically instead of one requiring an extra click.

## File map

```
src/
  services/
    auth.service.ts       DummyJSON login/refresh
    user.service.ts       usersApi — full CRUD against the Express /users API, nullifyUndefined() for clears, randomNumericId() for create, buildUserListQuery() for search/filter/sort/pagination
    upload.service.ts     uploadApi — file/image upload/delete against the Express /images API
  lib/
    axios.ts             httpClient (DummyJSON, Bearer auth + auto-refresh interceptor) + localApiClient (Express API) + env validation
    utils.ts              cn() — clsx + tailwind-merge, used by every shadcn/ui component
  features/auth/
    AuthContext.tsx, ProtectedRoute.tsx, context.ts, tokenStorage.ts (in-memory access token + localStorage refresh token), useAuth.ts, authEvents.ts
  hooks/
    useImageUpload.ts     shared upload/delete state machine behind both upload fields
    useUsers.ts           list state, pagination/search/filter/sort, first-load-only loading flag
  components/
    DocumentFileUploadSection.tsx  "Document & File Upload" field (PDF/DOC/DOCX/TXT), rendered inside UserFormModal
    ProfileImageField.tsx          profile image field inside UserFormModal (Add/Edit User)
    UsersToolbar.tsx                search input, gender filter, rows-per-page select
    PaginationControls.tsx          page navigation
    UserTable.tsx (Photo + Document columns, sortable headers), UserFormModal.tsx (shadcn Dialog), ConfirmDialog.tsx (shadcn AlertDialog)
    Toast.tsx (ToastData type only — rendering goes through ui/sonner.tsx's <Toaster/>, mounted in App.tsx)
    ErrorPage.tsx, ErrorBoundary.tsx
    ui/                  shadcn/ui primitives: button, input, label, select, dialog, alert-dialog, table, sonner
  pages/
    LoginPage.tsx, DashboardPage.tsx (renders "Signed in as <username>"), NotFoundPage.tsx
  types/
    user.ts (User.image, User.document: UserDocument), upload.ts (UploadResult.mimeType/size)
  utils/
    fileValidation.ts (+ .test.ts)   validateFile, formatFileSize, getFileTypeLabel, truncateFileName — shared by both upload fields and UserTable
  constants/
  index.css              Tailwind bootstrap + shadcn theme tokens only — no component CSS
server/                  Express + Supabase API — see "Backend: Express API" above for its internal layout
```

## What has been verified end-to-end (not just typechecked)

> The list below is a historical record from the json-server/`db.json` phase
> of this project (before the Supabase migration). It hasn't been re-run
> against the current Express/Supabase backend — treat claims of "confirmed
> to mutate `db.json` on disk" as describing the old backend, not the
> current one.

Every feature below was driven through a real headless browser (Playwright)
against the actually-running `pnpm dev` + `pnpm server` processes, with
network requests and `db.json` checked before/after — not just asserted from
code reading:

- Login against the real DummyJSON API
- Users: create (`POST`), full update (`PUT`), partial update (`PATCH`),
  delete (`DELETE`), list (`GET`) — each confirmed to mutate `db.json` on disk
- **Clearing an optional field (Age) via "Save changed fields" and
  confirming after a page reload that it actually persisted as cleared**
  (not just cleared in local React state)
- Profile image and Document & File Upload, both inside the Add User modal:
  select → auto-upload → modal stays open → replace via the edit icon →
  Create closes the modal → the image/document shows up in `UserTable` →
  still there after a hard page reload
- The two "modal closes on upload" bugs above, each reproduced in isolation
  and confirmed fixed (one POST to `/images` no longer triggers a page
  reload; selecting a file no longer dismisses the Radix `Dialog`)
- Full regression run after the Tailwind/shadcn migration: `tsc --noEmit`,
  `eslint`, `vitest run` (16 tests across 3 files), and `vite build` all
  clean, plus a full visual/functional pass confirming the redesign didn't
  change any behavior

## Audit and fixes applied

A full audit of `src/`, `db.json`, `package.json`, `.env`, and `patches/` was
run against the codebase early in this project's history. Every finding
below was verified against the actual code before being acted on. All
must-fix and code-quality items were then fixed and re-verified live in the
browser; a couple of items are intentionally left as documented, accepted
trade-offs for a local demo.

### Fixed

1. **Object URL leak in the original image upload section.** Fixed by
   moving all upload state into the shared `useImageUpload` hook, which
   revokes the previous object URL on every re-select/clear.
2. **No object URL revoked on unmount.** Fixed in the same hook via a
   `useEffect` cleanup that revokes whatever URL is outstanding when the
   component unmounts.
3. **Race condition in `DashboardPage.handleEditClick`.** Fixed with a
   request-token ref (`editRequestIdRef`) that ignores a stale response, plus
   `UserTable` now disables every Edit/Delete button while any edit-fetch is
   in flight (previously only the clicked row's own button was disabled).
4. **Clearing an optional field silently failed to persist via "Save changed
   fields."** Fixed at the API boundary: `usersApi.update`/`patch` now run
   the request body through `nullifyUndefined()` (`src/api/users.ts`), which
   converts `undefined` values to `null` before sending — `undefined` keys
   are dropped by `JSON.stringify` and never reach the server, `null` is
   preserved. `User.age`/`gender` widened to `number | null` / `string |
   null` to match. **Verified live**: cleared the Age field via "Save changed
   fields," reloaded the page, and confirmed the field came back empty.
5. **Env var mismatch.** An env var wasn't declared in `ImportMetaEnv`, and
   a dead Imgur-related var was still declared. Fixed — renamed to
   `VITE_LOCAL_API_URL` (see item 11) and properly declared; the stale entry
   removed.
6. **No environment validation at startup.** Fixed — `src/api/client.ts` now
   calls `requireEnv()` when constructing both Axios instances, throwing
   immediately with a clear message if a required var is missing.
9. **Three near-identical upload sections were ~90% duplicated code.** Fixed
   by extracting `src/hooks/useImageUpload.ts`; each consumer now only owns
   its own markup and drag-and-drop wiring. (Two of those three original
   sections have since been removed entirely — see "Recent feature changes.")
10. **`AuthUser.id` vs `User.id` naming collision.** Fixed — `AuthUser.id`
    renamed to `AuthUser.authId` with a comment explaining it's DummyJSON's
    unrelated numeric session id, not a json-server `User.id`.
11. **Env var name undersold what it's used for.** Renamed to
    `VITE_LOCAL_API_URL` throughout (`.env`, `.env.example`, `vite-env.d.ts`,
    `client.ts`).
13. **No request cancellation.** Partially fixed — the initial `GET /users`
    on mount now passes an `AbortSignal` and is cancelled on unmount. Upload
    and delete calls are intentionally left uncancelled: they're short-lived,
    user-initiated, single-flight actions where cancelling mid-flight would
    need its own UX (e.g. a Cancel button), which wasn't asked for.
14. **Zero tests.** Added Vitest (`pnpm test`) with unit tests for
    `fileValidation.ts`, `diffValues.ts`, and `nullifyUndefined`/`usersApi` —
    16 tests total across 3 files, all passing.
15. **No React error boundary.** Added `src/components/ErrorBoundary.tsx`,
    wrapping `<App />` in `main.tsx`.
16. **Modal accessibility gaps.** Originally fixed with a custom
    `useModalA11y` hook (Escape-to-close + initial focus). That hook no
    longer exists — it was superseded when `UserFormModal`/`ConfirmDialog`
    moved to shadcn/ui's `Dialog`/`AlertDialog` (Radix-based), which provide
    Escape-to-close, a real focus trap, and initial focus natively, making
    the custom hook unnecessary. Hidden `<input type="file">` elements also
    carry `tabIndex={-1}` so they don't create a duplicate tab stop next to
    the styled drop area.
17. **`README.md` was stale.** Rewritten at the time to describe the
    then-current architecture. It has since drifted stale again following
    the changes in this document's later sections and could use another
    pass.

### Found and fixed during re-verification (not in the original audit)

While re-verifying the `AbortController` fix (#13) live in the browser, a
real regression surfaced: `usersApi.list()` wraps every error — including a
cancelled request — into a generic `ApiError` via `toApiError()`, so
`axios.isCancel(error)` in `DashboardPage` could never actually detect a
cancellation. Combined with React StrictMode's dev-only double-invoke of
effects (mount → cleanup/abort → mount again), the first (aborted) request's
error handling could race against the second (successful) request and leave
`loadError` stuck, hiding the Users table entirely despite data having
loaded correctly. Fixed by checking `signal?.aborted` directly in the
`catch` block instead of relying on `axios.isCancel()` seeing through the
`ApiError` wrapper. Caught by re-running the full flow in a real browser
after the fix — not something typechecking or the unit tests would have
surfaced, since the bug was a timing race in a dev-only double-invoke.

### Intentionally left as documented trade-offs (not fixed)

7. **Access/refresh tokens in `localStorage`.** Already self-documented in
   `tokenStorage.ts` as a demo-only choice; no XSS injection vector exists in
   the current codebase (no `dangerouslySetInnerHTML`/`innerHTML`/`eval`
   anywhere in `src/`), so this is a latent risk rather than an active one.
8. **json-server's CORS is wide open, with a 10MB body limit.** Fine for
   local dev; would be an unauthenticated open write API if ever pointed at
   a real deployment. Documented in the README's "Known limitations."
12. **Base64-in-JSON storage / no pagination on `GET /users` or
    `GET /images`.** `db.json` grows fast and everything loads into memory
    on every request. Acceptable for a demo of this scope; would need real
    object storage and pagination beyond that. Documented in the README.

## Recent feature changes (post-audit)

Changes made after the original audit above, in the order they were
requested:

1. **Removed the "Image Upload Demo" section entirely.** Deleted its
   component, dashboard import/usage, and exclusive CSS. The shared
   hook/API it depended on stayed, since the other upload surfaces still
   used them.
2. **Toast position moved to top-right.**
3. **"File Drop Zone" converted to "Document & File Upload."** Started
   accepting PDF/DOC/DOCX/TXT (10MB max) instead of images.
   `UploadResult` gained `mimeType`/`size` fields to support this.
4. **`FileDropZone`/`FileDropZoneSection` renamed to
   `DocumentFileUpload`/`DocumentFileUploadSection`** to match the new
   terminology.
5. **Profile image upload added to the Add User/Edit User modal.** New
   `ProfileImageField.tsx`, rendered above First Name in `UserFormModal`,
   reusing `useImageUpload`/`uploadApi`. Auto-uploads on selection; the
   resulting URL is written to the form's `image` field and included in the
   `Create`/`Save` call. `User`/`UserInput` gained `image?: string | null`.
   `UserTable` gained a "Photo" column showing the avatar or a placeholder
   icon.
6. **Standalone "Profile Image Upload" dashboard section removed** —
   `ProfileImageField` (previous item) fully replaced it.
7. **User ID generation fixed at its true root cause.** See "ID
   generation" and "json-server patches" above.
8. **`db.json` cleanup.** Removed stray users with random-string ids
   created while ID generation was still broken, via the app's own
   `DELETE /users/:id` endpoint.
9. **The Vite dev-server full-reload-on-upload bug found and fixed.** See
   "Two real bugs found and fixed this session" above — `vite.config.ts` now
   ignores `db.json` in its file watcher.
10. **"Document & File Upload" moved from a standalone dashboard section
    into the Add User/Edit User modal**, placed directly below the
    Age/Gender row. `DocumentFileUploadSection` was rewritten to mirror
    `ProfileImageField`'s structure exactly: `value`/`onChange` props,
    auto-upload on selection, a single replace (✎) icon, no manual
    Upload/Remove buttons. `DocumentFileUpload.tsx` (the old presentational
    sub-component) was deleted — its design (large drag card, inline Upload
    button, result card with Replace/Remove) no longer exists.
11. **Uploaded documents now persist on the user record.** `User`/`UserInput`
    gained `document?: UserDocument | null` (`{ url, name, mimeType, size }`).
    `UserTable` gained a "Document" column: a 📄 icon + filename (truncated
    via the new `truncateFileName()` util to ~5 characters + `"..."`, full
    name in a `title` tooltip) linking to the stored file, or an em dash
    when absent. Verified to survive a hard page reload.
12. **`UserFormModal`'s `DialogContent` capped at `max-h-[85vh]` with
    internal scroll**, so the now-longer form (Photo, all fields, Document)
    never gets cut off at the bottom of the viewport with Create/Cancel
    unreachable.
13. **Full migration off custom CSS to Tailwind + shadcn/ui only.** See
    "Styling: full migration to Tailwind + shadcn/ui" above —
    `src/index.css` reduced from ~520 lines to ~80, every component
    rewritten to Tailwind utility classes, and every native `<input>`
    (including the `type="file"` ones) converted to shadcn's `Input`
    component.
14. **Backend migrated from json-server to a Supabase-backed Express API.**
    `db.json`/`patches/json-server.patch` removed. `src/api/*` renamed to
    `src/services/*` (`user.service.ts`, `upload.service.ts`, plus the new
    `auth.service.ts`). See "Backend: Express API" and "Migrating off
    json-server" above.
15. **Server-side search, gender filtering, column sorting, and pagination
    added to the Users API and dashboard UI.** New `UsersToolbar.tsx` and
    `PaginationControls.tsx` components, `useUsers.ts` hook, and
    `buildUserListQuery()` in `user.service.ts`. See "Search, filter, sort,
    pagination" above.
16. **Auth token storage hardened.** The access token moved out of
    `localStorage` into an in-memory variable, with a silent refresh on
    boot and an Axios interceptor that auto-refreshes on `401`. See
    "Authentication" above.
17. **Header now shows the signed-in user, and a loading-flash bug was
    fixed.** `DashboardPage.tsx` renders "Signed in as `<username>`";
    `useUsers.ts` now only shows the full-page loading state on the very
    first load, instead of on every filter/sort/page change. Image uploads
    now go to real Supabase Storage instead of being stored as base64 in
    the database.
18. **TanStack Query introduced (in progress).** `@tanstack/react-query`
    added as a workspace dependency; `src/lib/queryClient.ts` creates a
    single `QueryClient` (default options), and `App.tsx` wraps the whole
    tree in `QueryClientProvider` (outside `AuthProvider`). This first step
    is additive only — no existing hook/component has been migrated yet, so
    `useUsers.ts` and the rest of the manual fetch logic are unchanged and
    still fully functional. Planned follow-up: migrate GET calls
    (`usersApi.list`/`getById`) to `useQuery`, and POST/PUT/PATCH/DELETE
    calls (`usersApi.create`/`update`/`remove`, `uploadApi.uploadImage`/
    `deleteImage`) to `useMutation` with `invalidateQueries` on success to
    refetch the affected list.
