FROM node:22-alpine AS build

WORKDIR /curvytron

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.js tsconfig.json ./
COPY public public
COPY src src
RUN npm run build


FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080
WORKDIR /curvytron

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/server src/server
COPY src/shared src/shared
COPY --from=build /curvytron/dist dist

EXPOSE 8080

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget -qO /dev/null http://127.0.0.1:${PORT}/ || exit 1

CMD ["node", "src/server/launcher.js"]
