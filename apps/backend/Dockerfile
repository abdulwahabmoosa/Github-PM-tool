# syntax=docker/dockerfile:1.6

# ─────────────────────────────────────────────────────────────────────────
# Stage 1 — Install deps for both backend and frontend
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Copy lockfile + workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install pnpm + all workspace deps
RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────
# Stage 2 — Build the frontend
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend ./apps/frontend

# Empty base URL => API calls go to same origin
ENV VITE_API_BASE_URL=""

WORKDIR /app/apps/frontend
RUN npx vite build

# ─────────────────────────────────────────────────────────────────────────
# Stage 3 — Generate Prisma client for Linux
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN npx prisma generate

# ─────────────────────────────────────────────────────────────────────────
# Stage 4 — Runtime image (smallest possible)
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Backend code + generated Prisma client + deps
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/apps/backend ./apps/backend

# Frontend static files
COPY --from=frontend-builder /app/apps/frontend/dist ./apps/frontend/dist

EXPOSE 8080
WORKDIR /app/apps/backend
CMD ["node", "src/index.js"]