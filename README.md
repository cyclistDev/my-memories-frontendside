# MyMemories

A personal memory journal frontend built with React, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

The frontend uses `http://localhost:8080` as its API base URL by default. To point it to another backend, set `VITE_API_BASE_URL` in a `.env` file at the project root:

```env
VITE_API_BASE_URL=http://localhost:8080
```

The backend must allow the frontend's origin through `CORS_ALLOWED_ORIGINS`.

## Current features

- Sign up with a username, email, and password, or log in with email and password.
- Successful authentication stores the returned JWT and user details in `sessionStorage`; signing out clears the session.
- A journal dashboard with sample memories, search, and add/edit/delete interactions.
- Memory data is currently demo-only and resets when the page is reloaded. The frontend does not send memory requests because memory CRUD endpoints are not implemented by the backend.

## Available backend routes

The frontend calls only:

- `POST /api/auth/register`
- `POST /api/auth/login`

When protected API requests are added, they should send the stored JWT in the `Authorization: Bearer <token>` header. No protected memory endpoint is currently called.
