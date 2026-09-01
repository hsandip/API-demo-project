# User Manager

A React + TypeScript + Vite demo app with login, full CRUD user management,
and three image-upload UI variations. See [IMPLEMENTATION.md](./IMPLEMENTATION.md)
for the full write-up of what's built and why.

## Stack

- React 19, React Router, Vite, TypeScript
- Axios for HTTP, via two clients in `src/api/client.ts` — one for DummyJSON
  auth, one for the local json-server instance
- [json-server](https://github.com/typicode/json-server) as a local mock
  REST database (`db.json`) for Users CRUD and image storage
- Vitest for unit tests

## Running locally

Two processes are required:

```bash
pnpm install
pnpm dev      # Vite dev server — http://localhost:5173
pnpm server   # json-server — http://localhost:3001, backed by db.json
```

`pnpm server` must be running for the Users table and any of the image
upload sections to work — `pnpm dev` alone only serves the frontend.

Log in with the DummyJSON demo user: `emilys` / `emilyspass` (see
[dummyjson.com/docs/auth](https://dummyjson.com/docs/auth) for others). Login
is the one feature that talks to the real DummyJSON API — everything else
(Users CRUD, image upload) runs against your local json-server.

### Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | DummyJSON base URL, used only for login. |
| `VITE_LOCAL_API_URL` | Local json-server base URL, used for both the Users API and the image upload API. |

Both are validated at startup — the app throws a clear error immediately if
either is missing, rather than failing later with a confusing network error.

### Tests

```bash
pnpm test
```

## Structure

- `src/api/` — the only files that call Axios: `client.ts` (both Axios
  instances + error normalization + env validation), `auth.ts` (DummyJSON
  login), `users.ts` (Users CRUD against json-server), `upload.ts` (image
  upload/delete against json-server)
- `src/auth/` — auth context/provider, `useAuth` hook, route guard, token
  storage
- `src/hooks/` — `useImageUpload` (shared upload/delete state machine behind
  all three upload sections), `useModalA11y` (Escape-to-close + initial
  focus for modals)
- `src/pages/` — `LoginPage`, `DashboardPage`, `NotFoundPage`
- `src/components/` — `UserTable`, `UserFormModal`, `ConfirmDialog`, `Toast`,
  `ErrorPage`, `ErrorBoundary`, plus the three upload sections:
  `ImageUploadSection`, `FileDropZoneSection` (+ `FileDropZone`),
  `AvatarUploadSection`
- `src/types/` — shared `User`/`AuthUser` types
- `src/utils/fileValidation.ts` — shared file type/size validation, used by
  all three upload sections
- `db.json` — the json-server database (`users`, `images` collections)
- `patches/json-server.patch` — raises json-server's default 100KB request
  body limit to 10MB so base64-encoded image uploads fit; applied
  automatically on `pnpm install` via `pnpm.patchedDependencies`

## Known limitations (by design, for a local demo)

- Images are stored as base64 data URLs directly in `db.json` — simple, but
  bloats the file and loads the whole collection into memory on every `GET`.
  Not meant to scale past demo use.
- No pagination on `GET /users` or `GET /images`.
- Auth tokens are stored in `localStorage` (documented in
  `src/auth/tokenStorage.ts`) rather than an httpOnly cookie, since there's
  no real backend to set one.
- json-server's CORS is wide open with no auth — fine for local dev, not
  something to point a real deployment at.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the complete list of design
decisions and a verified audit of further improvement opportunities.
