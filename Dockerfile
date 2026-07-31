# ---------------------------------------------------------------------------
# SkillSplore production/demo image.
# Multi-stage: build the web client and API, then ship a lean runtime that
# serves the built React app as static files from the API process.
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install workspace deps using lockfile for reproducible builds.
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install

# Copy sources and build both workspaces.
COPY . .
RUN npm run build -w @skillsplore/web \
 && npx --workspace @skillsplore/api prisma generate \
 && npm run build -w @skillsplore/api

# --- runtime ----------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# openssl is required by Prisma's query engine on debian-slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
# Built static web client served by the API.
COPY --from=build /app/apps/web/dist ./apps/web/dist

EXPOSE 4000
CMD ["node", "apps/api/prisma/bootstrap.mjs"]
