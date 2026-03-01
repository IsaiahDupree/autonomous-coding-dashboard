# Content Factory - Docker Multi-Stage Build (CF-WC-111)
# Optimized for production deployment with minimal image size

# Base stage - shared dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/
COPY backend/package*.json ./backend/
RUN npm ci --only=production

# Builder stage - build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build dashboard
WORKDIR /app/dashboard
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm run build

# Production image - dashboard
FROM base AS dashboard-runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/dashboard/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]

# Production image - backend API
FROM base AS backend-runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

COPY --from=builder --chown=apiuser:nodejs /app/backend/dist ./dist
COPY --from=deps /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/prisma ./prisma

USER apiuser
EXPOSE 3001
ENV PORT 3001

CMD ["node", "dist/index.js"]
