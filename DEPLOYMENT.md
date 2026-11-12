# SCRM production deployment

The repository now includes a deployable Express + SQL Server target:

- `Backend/Dockerfile` — Node 22 Alpine, non-root, health check.
- `Frontend/Dockerfile` — Vite build served by nginx, `/api` and `/uploads` reverse-proxied.
- `docker-compose.yml` — SQL Server 2022, backend and frontend with persistent volumes.
- `.env.production.example` — every value you must provide; never commit the real `.env`.

## First deployment

1. Copy `.env.production.example` to `.env` and set long random values for `MSSQL_SA_PASSWORD` and `JWT_SECRET`.
2. Set `APP_URL` and `BACKEND_URL` to the public HTTPS origin.
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
