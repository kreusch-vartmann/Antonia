# syntax=docker/dockerfile:1

# ---------- Abhängigkeiten ----------
FROM node:26-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Build ----------
FROM node:26-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Platzhalter nur für die Build-Analyse von SvelteKit. Keine echten Zugangsdaten!
# Die echten Werte kommen zur Laufzeit aus den Coolify-Umgebungsvariablen.
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    REDIS_URL=redis://localhost:6379 \
    APP_SECRET=build-placeholder-not-a-secret-000000 \
    npm run build \
 && npm prune --omit=dev --no-audit --no-fund

# ---------- Laufzeit ----------
FROM node:26-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    PROTOCOL_HEADER=x-forwarded-proto \
    HOST_HEADER=x-forwarded-host \
    ADDRESS_HEADER=X-Forwarded-For \
    XFF_DEPTH=1 \
    BODY_SIZE_LIMIT=1M
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/drizzle ./drizzle

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "build"]
