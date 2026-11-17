# SCRM production deployment

The repository now includes a deployable Express + SQL Server target:

- `Backend/Dockerfile` — Node 22 Debian slim with Chromium and emoji fonts; starts as root only long enough to fix named-volume ownership, then drops to the non-root `scrm` user.
- `Frontend/Dockerfile` — Vite build served by nginx, `/api` and `/uploads` reverse-proxied.
- `docker-compose.yml` — SQL Server 2022, backend and frontend with persistent volumes.
- `.env.production.example` — every value you must provide; never commit the real `.env`.

## Vercel multi-service deployment

The root `vercel.json` deploys both applications as Vercel services in one project. In the Vercel project settings, set **Framework Preset → Services**; the presence of `vercel.json` alone does not switch an existing project to services mode.

- `frontend` (Vite) is public at `/` and handles SPA deep links through its service-local rewrite to `/index.html`.
- `backend` (Express) is reachable at `/api/*`, `/uploads/*` and `/health`. It stays internal otherwise.
- The browser calls the API same-origin at `/api`; there is no build-time or server-to-server service binding to configure. No service bindings are declared because neither service invokes the other over HTTP at runtime.
- `/api` is kept on the Express service, so the Express routers continue to see the original `/api/...` path. No path-stripping transform is required.

Set these Vercel environment variables for Production and Preview:

- `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — an externally reachable SQL Server. `localhost` and the Docker service name are not reachable from Vercel.
- `DB_ENCRYPT=true`, `DB_TRUST_SERVER_CERTIFICATE=false` for a certificate-backed SQL Server.
- `JWT_SECRET`, `APP_URL` (the public deployment origin) and `CORS_ORIGINS` (comma-separated production/preview origins).
- `BACKEND_URL` (the same public origin; used in tracking pixels and email links).
- SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), Google (`GOOGLE_CLIENT_ID`) and ImageKit (`IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`).
- `VITE_GOOGLE_CLIENT_ID` for the frontend build. Leave `VITE_API_URL` unset (or set it to `/api`).

Use `vercel dev -L` to run both services locally. The configuration allows Vercel's own deployment/branch hostnames for CORS, so Preview deployments work without manually adding every preview URL.

Final public routing order:

| Public path | Service | Notes |
| :--- | :--- | :--- |
| `/api/*` | `backend` | Express routers already mount under `/api`. |
| `/uploads/*` | `backend` | Public avatar/cover files only. |
| `/health` | `backend` | Express health check. |
| `/*` | `frontend` | Vite SPA; deep links rewrite to `index.html`. |

**Serverless limitations:** Vercel Functions have no persistent local filesystem or long-lived background process. WhatsApp Web pairing, the daily backup scheduler, and business attachments stored in `Backend/uploads` require a persistent host such as the Docker Compose target below. Profile images use ImageKit and work on Vercel. For full WhatsApp, attachment and scheduled-backup behavior, keep the backend on the Docker target and use Vercel only for the frontend, or move attachments and automation to managed storage/queues first.

## Docker notes

Docker Desktop with Linux containers must be installed and running before building. Without a `.env`, Compose substitutes blank values for the SQL Server password and JWT secret, which prevents startup; create the local `.env` described below first.

The backend entrypoint repairs ownership of the `uploads_data` and `wa_session` named volumes before starting Node. If a volume was previously created by a root container, this fixes the common `EACCES`/read-only Chromium-profile failure without deleting the WhatsApp session. The container also verifies `WA_CHROME_PATH` is executable and fails with a clear log line instead of repeatedly crashing the WhatsApp client.

Useful checks:

```bash
docker compose config
docker compose build --no-cache backend frontend
docker compose up -d
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

`GET http://localhost:8080/health` should return `200`, and `docker compose exec backend gosu scrm sh -c 'test -w /app/.wwebjs_auth && test -w /app/uploads && echo writable'` should print `writable`.

## First deployment

1. Copy `.env.production.example` to `.env` and set long random values for `MSSQL_SA_PASSWORD` and `JWT_SECRET`.
2. Set `APP_URL` and `BACKEND_URL` to the public HTTPS origin. Set `CORS_ORIGINS` to the exact comma-separated frontend origin(s); unknown origins are rejected instead of reflected.
3. Set SMTP, Google client ID and ImageKit keys.
4. Run `docker compose up -d --build`.
5. Open `http://<server>:8080` (or the port in `HTTP_PORT`) and complete the first-run admin setup.

The database schema is created and migrated idempotently by the backend at startup. Back up the `mssql_data` and `uploads_data` volumes, and take regular CRM snapshots from Settings → Security & backup.

## HTTPS and Google

Put Caddy, Traefik or a cloud load balancer in front of port 8080 and terminate TLS there. Add `https://<your-domain>` to the authorized JavaScript origins and `https://<your-domain>/` to the redirect URIs of the Google OAuth web client. For local development keep `http://localhost:5173` in Google's authorized origins.

## WhatsApp

The backend runs `whatsapp-web.js` in-process. Chromium is installed in the backend image, and the pairing session is stored in the `wa_session` volume. To pair:

1. Open **WhatsApp** in the CRM as an administrator.
2. Scan the QR code with **WhatsApp → Linked devices → Link a device**.
3. Confirm the status becomes **Connected** before assigning `whatsapp.send` to other roles.

Keep exactly one backend replica running: a WhatsApp Web session cannot be shared by two processes. Back up the `wa_session` volume; losing it only requires re-pairing, not losing CRM history. WhatsApp Web is an unofficial client and numbers used for unsolicited bulk messaging can be banned — message only customers who expect it.

## Before going live

- Rotate the development SMTP app password, JWT secret and ImageKit keys.
- Set `NODE_ENV=production` and confirm the health endpoint reports `healthy`.
- Restrict database port 1433 to the backend network only (the compose file does not publish it).
- Enable server-level backups and test restoring them.
- Remove disposable QA accounts and records before importing real customer data.
