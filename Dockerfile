# ---------------------------------------------------------------------------
# SkillSplore production/demo image.
# Multi-stage: build the web client and API, then ship a lean runtime that
# serves the built React app as static files from the API process.
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Installed here too (not just in the runtime stage below) so `prisma
# generate` detects the real openssl version present -- without it, Prisma
# guesses the wrong binaryTarget and the runtime stage can't find a matching
# query engine. binaryTargets in schema.prisma pins this explicitly too, but
# fixing the actual mismatch here is the real fix, not just a workaround.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

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
# Prisma's own scripts (seed.ts, reset.ts, accounts.ts, export.ts) run
# directly via tsx rather than the compiled dist/ output, and may import
# shared helpers from src/lib -- so that source tree is needed at runtime
# too, not just the compiled dist/ used by the actual server process.
COPY --from=build /app/apps/api/src ./apps/api/src
# Built static web client served by the API.
COPY --from=build /app/apps/web/dist ./apps/web/dist
# Public brand/marketing kit served at /brand -- scoped to this one
# subfolder only, not the rest of docs/ (security/deployment notes).
COPY --from=build /app/docs/brand ./docs/brand

EXPOSE 4000
CMD ["node", "apps/api/prisma/bootstrap.mjs"]
