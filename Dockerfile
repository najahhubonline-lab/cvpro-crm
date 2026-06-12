# Stage 1: Build Frontend (React)
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Backend (NestJS)
FROM node:20-slim AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ build-essential pkg-config libssl-dev openssl \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npx prisma generate && npm run build

# Stage 3: Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
    
COPY --from=backend-builder /app/backend/package.json ./package.json
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=frontend-builder /app/dist ./dist/client

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
