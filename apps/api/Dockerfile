FROM node:20-alpine AS base

RUN apk add --no-cache openssl

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# ── Dependencies ───────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/act-prompts/package.json ./packages/act-prompts/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter api...

# ── Build ──────────────────────────────────────────────────────────────────────
FROM deps AS builder

COPY packages/shared-types/ ./packages/shared-types/
COPY packages/act-prompts/ ./packages/act-prompts/
COPY apps/api/ ./apps/api/

RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/act-prompts/package.json ./packages/act-prompts/
COPY apps/api/package.json ./apps/api/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter api...

# Copy built artifacts
COPY --from=builder /app/packages/shared-types/src ./packages/shared-types/src
COPY --from=builder /app/packages/act-prompts/src ./packages/act-prompts/src
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Re-generate Prisma client in runner (pnpm store path differs from builder)
RUN pnpm --filter api exec prisma generate

WORKDIR /app/apps/api

# Railway injects PORT — expose dynamically
EXPOSE 8080

ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:$PATH"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
