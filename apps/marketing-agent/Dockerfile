# ---------------------------------------------------------------------------
# SkillSplore marketing-agent — standalone image, independent of the
# marketplace's Dockerfile. Builds this service's own API and dashboard SPA;
# ships a lean runtime that serves the SPA from the API process (single
# origin), same pattern as the root Dockerfile but a completely separate
# build/deploy artifact.
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY web/package.json web/package.json
RUN npm install

COPY . .
RUN npm run build:web \
 && npx prisma generate \
 && npm run build

# --- runtime ----------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/web/dist ./web/dist

EXPOSE 4100
# docker-compose.yml overrides this CMD for the worker service (node dist/worker.js).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
