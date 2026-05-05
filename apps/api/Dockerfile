FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate && npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY package.json ./
COPY apps ./apps
COPY database ./database

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node apps/api/src/server.js"]
