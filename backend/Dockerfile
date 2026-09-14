# =============================================================================
# Multi-Stage Build Dockerfile for NestJS Backend Microservice
# =============================================================================

# Stage 1: Build Dependencies & Compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Stage 2: Production Container Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built assets and production node_modules
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY src/database/migrations ./dist/src/database/migrations

USER node
EXPOSE 3000

CMD ["node", "dist/main.js"]
