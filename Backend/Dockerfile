FROM node:22-bookworm-slim AS deps
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package*.json ./
COPY scripts ./scripts
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    WA_CHROME_PATH=/usr/bin/chromium \
    WA_SESSION_DIR=/app/.wwebjs_auth \
    HOME=/home/scrm
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation fonts-noto-color-emoji gosu \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r scrm \
    && useradd -r -g scrm -m -d /home/scrm scrm
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY scripts ./scripts
COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p uploads .wwebjs_auth \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && chown -R scrm:scrm /app /home/scrm
EXPOSE 5000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
