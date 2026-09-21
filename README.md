# User Manager

A React + TypeScript + Vite demo app with login, full CRUD user management,
and three image-upload UI variations. See [IMPLEMENTATION.md](./IMPLEMENTATION.md)
for the full write-up of what's built and why.

## Stack

- React 19, React Router, Vite, TypeScript
- Axios for HTTP, via two clients in `src/lib/axios.ts` — one for DummyJSON
  auth, one for the local Express API
- Express + TypeScript (`server/`) as the local REST API for Users CRUD and
  image storage — see [IMPLEMENTATION.md](./IMPLEMENTATION.md) for its
  structure
- Vitest for unit tests

## Running locally

Two processes are required:

```bash
pnpm install
pnpm dev      # Vite dev server — http://localhost:5173
pnpm server   # Express API (server/) — http://localhost:4000, backed by Supabase
```

`pnpm server` must be running for the Users table and any of the image
upload sections to work — `pnpm dev` alone only serves the frontend.
`pnpm server` itself requires a Supabase project (free tier) — see
[IMPLEMENTATION.md](./IMPLEMENTATION.md#setting-up-supabase-one-time) for
one-time setup (create the tables, add `server/.env` credentials).

Log in with the DummyJSON demo user: `emilys` / `emilyspass` (see
[dummyjson.com/docs/auth](https://dummyjson.com/docs/auth) for others). Login
is the one feature that talks to the real DummyJSON API — everything else
(Users CRUD, image upload) runs against your local Express API.

### Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | DummyJSON base URL, used only for login. |
| `VITE_LOCAL_API_URL` | Local Express API base URL (`server/`), used for both the Users API and the image upload API. |

Both are validated at startup — the app throws a clear error immediately if
either is missing, rather than failing later with a confusing network error.

### Tests

```bash
pnpm test
```

## Structure

- `src/services/` — the only files that call Axios: `user.service.ts` (Users
  CRUD against the local Express API, with pagination/search/filter/sort
  query params), `upload.service.ts` (image upload/delete), `auth.service.ts`
  (DummyJSON login)
- `src/lib/axios.ts` — both Axios instances + error normalization + env
  validation
- `src/features/auth/` — auth context/provider, `useAuth` hook, route guard,
  token storage
- `src/hooks/` — `useUsers` (Users list state: pagination, search, filter,
  sort), `useImageUpload` (shared upload/delete state machine)
- `src/pages/` — `LoginPage`, `DashboardPage`, `NotFoundPage`
- `src/components/` — `UserTable`, `UsersToolbar`, `PaginationControls`,
  `UserFormModal`, `ConfirmDialog`, `Toast`, `ErrorPage`, `ErrorBoundary`,
  plus the upload sections
- `src/types/` — shared `User`/`AuthUser` types
- `src/utils/fileValidation.ts` — shared file type/size validation
- `server/` — the local Express + TypeScript REST API backing Users CRUD and
  image storage, storing everything in Supabase (hosted Postgres) rather
  than a local file. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for its
  internal structure and Supabase setup steps.

## Known limitations (by design, for a local demo)

- Images are stored as base64 data URLs directly in the `images` table —
  simple, but bloats each row and loads the whole matching set into memory
  on every `GET /images`. Not meant to scale past demo use.
- `GET /users` supports pagination/search/filter/sort via query params, but
  `GET /images` does not.
- Auth tokens are stored in `localStorage` (documented in
  `src/features/auth/tokenStorage.ts`) rather than an httpOnly cookie, since
  there's no real backend to set one.
- The local Express API has no auth of its own (`CORS_ORIGIN` restricts which
  origins can call it, but any caller from that origin has full CRUD access)
  — fine for local dev, not something to point a real deployment at as-is.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the complete list of design
decisions and a verified audit of further improvement opportunities.
