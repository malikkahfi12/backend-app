FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public
RUN npx prisma generate
RUN npm run build
RUN echo "=== DIST CONTENTS ===" && ls -la dist/ || echo "dist/ MISSING"
RUN echo "=== FIND MAIN ===" && find dist -name "main.*" 2>/dev/null || echo "NO MAIN FILES"
RUN test -f dist/main.js && echo "OK: dist/main.js exists" || (echo "ERROR: dist/main.js NOT FOUND" && find /app -name "main.*" 2>/dev/null && exit 1)
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
