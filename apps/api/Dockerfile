FROM node:20-alpine AS base

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# ── Dependencies ───────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/trade-knowledge/package.json ./packages/trade-knowledge/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter api...

# ── Build ──────────────────────────────────────────────────────────────────────
FROM deps AS builder

COPY packages/shared-types/ ./packages/shared-types/
COPY packages/trade-knowledge/ ./packages/trade-knowledge/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @actober/trade-knowledge build
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/trade-knowledge/package.json ./packages/trade-knowledge/
COPY apps/api/package.json ./apps/api/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter api...

# Copy built artifacts
COPY --from=builder /app/packages/trade-knowledge/dist ./packages/trade-knowledge/dist
COPY --from=builder /app/packages/shared-types/src ./packages/shared-types/src
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma

WORKDIR /app/apps/api

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
