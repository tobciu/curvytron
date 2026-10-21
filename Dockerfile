# The server runs TypeScript directly: Node 22.18 or newer
FROM node:22-alpine AS build

RUN node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 18)) { console.error('Node 22.18 or newer is needed, this is ' + process.version); process.exit(1); }"

WORKDIR /curvytron

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.js tsconfig.json ./
COPY public public
COPY src src
RUN npm run build


FROM node:22-alpine

ARG APP_VERSION=dev
ARG APP_COMMIT=unknown
LABEL org.opencontainers.image.title="curvytron" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_COMMIT}"

ENV NODE_ENV=production \
    PORT=8080
WORKDIR /curvytron

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/server src/server
COPY src/shared src/shared
COPY --from=build /curvytron/dist dist

# For the log file of the configuration (`log.file`), mount a volume on it to keep it
RUN mkdir logs && chown node:node logs

EXPOSE 8080

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget -qO /dev/null http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "src/server/launcher.ts"]
