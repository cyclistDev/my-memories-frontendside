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

Configure the backend's `CORS_ALLOWED_ORIGINS` to include the exact frontend origin.

## Deploy to GitHub Pages

The GitHub Actions workflow builds the Vite app and deploys the generated `dist` directory. In the repository settings, select **Settings → Pages → Build and deployment → Source → GitHub Actions**. Push to `main` or run the workflow manually to deploy.

The Pages build uses the `/my-memories-frontendside/` project path and the deployed Render API URL. Update `VITE_API_BASE_URL` in `.github/workflows/deploy-pages.yml` if the backend URL changes. The backend must allow `https://cyclistdev.github.io` as a CORS origin.

## Current features

- Sign up with a username, email, and password, or log in with email and password.
- Successful authentication stores the returned JWT and user details in `sessionStorage`; signing out clears the local session.
- Create, list, edit, and delete personal memories through the authenticated memory API.
- Search memories by title or content; filter by event date and tag; sort and page through server results.
- Add event dates and up to 10 tags to each memory. The backend normalizes tags to lowercase.

## Backend integration

The frontend uses:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/memories` with search, date, tag, sort, and pagination parameters
- `POST /api/memories`
- `PUT /api/memories/{id}`
- `DELETE /api/memories/{id}`
- `GET /api/tags`

Protected requests send the stored JWT in the `Authorization` header using the `Bearer` scheme. Memory results are private to the signed-in account. The backend defaults to 20 records per page and caps page size at 50; this frontend requests 12 records per page.

The backend also supports profile, resurfacing, and resurfacing-settings routes, which are not currently used by this frontend.
