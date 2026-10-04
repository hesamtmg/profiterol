# Build context: repository root (see docker-compose.yml)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/blocks/package.json packages/blocks/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts
COPY packages/blocks packages/blocks
COPY apps/web apps/web
RUN npm run build -w @profiterol/blocks && npm run build -w @profiterol/web

# Nuxt's .output folder is self-contained, so the runtime image needs nothing else.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build /app/apps/web/.output .output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
