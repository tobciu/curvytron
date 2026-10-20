FROM node:22-alpine AS build

WORKDIR /curvytron

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.js ./
COPY public public
COPY src src
RUN npm run build


FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /curvytron

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/server src/server
COPY src/shared src/shared
COPY --from=build /curvytron/dist dist

EXPOSE 8080

USER node

CMD ["node", "src/server/launcher.js"]
