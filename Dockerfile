# Étape 1 : dépendances (better-sqlite3 se compile si aucun binaire précompilé n'existe pour l'architecture)
FROM node:24-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Étape 2 : minification du front (esbuild, dépendance de développement : absente de l'image finale)
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY scripts ./scripts
COPY site ./site
RUN npm run build

# Étape 3 : image finale, sans outils de compilation
FROM node:24-slim
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server ./server
COPY --from=build /app/dist/site ./site
RUN mkdir -p /data && chown node:node /data
USER node
ENV PORT=3000 DB_PATH=/data/repasse.db
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/server.js"]
