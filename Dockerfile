# syntax=docker/dockerfile:1

# ---- Build : frontend (Vite) + serveur (bundle unique) ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build \
 && npx esbuild server/index.ts --bundle --platform=node --format=cjs \
      --target=node22 --outfile=dist-server/index.cjs

# ---- Runtime : aucune dépendance npm nécessaire, tout est bundlé ----
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DIST_DIR=/app/dist \
    DATA_DIR=/data
WORKDIR /app

# Dossier des données (monté en volume), accessible à l'utilisateur non-root.
RUN mkdir -p /data && chown node:node /data

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server/index.cjs ./server.cjs

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.cjs"]
