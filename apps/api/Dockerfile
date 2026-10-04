# Build context: repository root (see docker-compose.yml)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/blocks/package.json packages/blocks/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts
COPY packages/blocks packages/blocks
COPY apps/api apps/api
RUN npm run build -w @profiterol/blocks && npm run build -w @profiterol/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/blocks/package.json packages/blocks/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --ignore-scripts -w @profiterol/api -w @profiterol/blocks && npm cache clean --force
COPY --from=build /app/packages/blocks/dist packages/blocks/dist
COPY --from=build /app/apps/api/dist apps/api/dist
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
