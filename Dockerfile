FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ARG DATABASE_URL="postgresql://admin:password@localhost:5432/trustnet"
ENV DATABASE_URL=${DATABASE_URL}
COPY tsconfig.json prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma
RUN npm run prisma:generate
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
EXPOSE 4000
CMD ["node", "dist/server.js"]
