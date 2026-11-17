#!/bin/sh
set -eu

# Named volumes are created by Docker as root even when the mount point is
# owned by the app user in the image. Prepare both persistent paths while we
# still have root, then run Node and Chromium as the unprivileged app user.
mkdir -p /app/uploads /app/.wwebjs_auth
chown -R scrm:scrm /app/uploads /app/.wwebjs_auth

if [ -n "${WA_CHROME_PATH:-}" ] && [ ! -x "${WA_CHROME_PATH}" ]; then
  echo "[entrypoint] Chromium is not executable at ${WA_CHROME_PATH}" >&2
  exit 1
fi

exec gosu scrm "$@"
