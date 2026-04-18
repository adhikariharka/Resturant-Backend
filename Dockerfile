# syntax=docker/dockerfile:1.7
# =============================================================================
# Harke backend — multi-stage image for NestJS 11 (Node 22 Alpine)
# =============================================================================

# ---------- 1. Dependencies (cacheable) ----------
FROM node:22-alpine AS deps
# bcrypt & pg may need build tools when prebuilt binaries aren't available
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Build TypeScript -> dist/ ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3. Production-only deps ----------
FROM node:22-alpine AS prod-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# ---------- 4. Runtime image ----------
FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=8000
WORKDIR /app

# Non-root user is already baked into the node image
USER node

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 8000
CMD ["node", "dist/main.js"]
