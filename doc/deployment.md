# Deployment (Docker image + Compose)

**Target:** CI builds a versioned Docker image and pushes it to a registry; the server runs
it via `docker compose pull && docker compose up -d`. No build toolchain on the deploy host.

**Done.** The `Dockerfile` and `docker-compose.yml` below are what's actually in the repo
(Phase 2 Step 7); CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) builds and
smoke-tests every push, and pushes the image to GHCR on a `vX.Y.Z` tag or manual dispatch.
The rest of this doc is kept as the design rationale / migration record.

## Target image — multi-stage `Dockerfile`

```dockerfile
# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build            # Vite client build + server bundle -> ./dist (client) + ./bin

# ---- runtime ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/bin ./bin
COPY --from=build /app/dist ./web        # static client served by express.static
COPY --from=build /app/web/images ./web/images
COPY --from=build /app/web/sounds ./web/sounds
COPY --from=build /app/web/font ./web/font
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
CMD ["node", "bin/curvytron.js"]
```

Notes:

- Exact `COPY` paths depend on where Vite writes the client build (`vite.config` `outDir`)
  and where the server bundle lands (`bin/` today). Pick one static dir and have the server
  `express.static()` it — see [`architecture.md`](architecture.md) §3.
- Non-root (`USER node`), `--omit=dev`, and a healthcheck are the main hardening steps over
  the current image.
- Optional smaller final stage: copy only prod `node_modules` from a dedicated
  `deps` stage instead of re-running `npm ci`.

## `docker-compose.yml` (deploy host — pulls the built image)

```yaml
services:
  curvytron:
    image: ghcr.io/tobciu/curvytron:latest   # or a pinned tag / version
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./config.json:/app/config.json:ro     # optional; server has sane defaults
    # environment / labels (reverse proxy) as needed
```

- WebSocket needs no special config — it's the same HTTP port, upgraded in-process.
  Behind a reverse proxy, forward `Upgrade`/`Connection` headers (see
  [`nginx-proxy.md`](nginx-proxy.md)) and set `X-Real-IP` (the server reads it).
- `config.json` is optional; without it the server uses `port 8080`, inspector off
  ([`configuration.md`](configuration.md)).

## Local development / build

```yaml
# docker-compose.override.yml  (git-ignored or committed for local use)
services:
  curvytron:
    build:
      context: .
      target: runtime
    image: curvytron:local
```

`docker compose up --build` then builds from source instead of pulling.

## CI — build & push the image

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml), two jobs:

- `build-and-test` — every push/PR to `main`/`modernize`: `npm ci`, typecheck,
  `svelte-check`, lint, Vitest, `npm run build`, then a smoke test (start
  `dist-server/main.js`, curl `/` for the `<title>`, an image, a sound file).
  Uploads `dist/` + `dist-server/` as a build artifact.
- `docker` (needs `build-and-test` to pass) — only on a `vX.Y.Z` tag push or a manual
  `workflow_dispatch`, **not** on a plain branch push: `docker/setup-buildx-action` +
  `docker/build-push-action`, tags `ghcr.io/tobciu/curvytron:{latest,<sha>,<semver>}`
  (`docker/metadata-action`), push to **GHCR** with the built-in `GITHUB_TOKEN`
  (`permissions: packages: write`), layer cache via `type=gha`.

Deploy = on the host: `docker compose pull && docker compose up -d` (or a webhook /
`watchtower` / a small deploy workflow over SSH) — not yet automated.

## Migration checklist

- [x] New multi-stage `Dockerfile` builds locally: `docker build -t curvytron:local .`
- [x] Container starts, serves the game on `:8080`, WebSocket connects, a round plays —
      verified against the actual published image (`docker pull` + `docker run` +
      played a full round in the browser: warmup → movement → wall crash → kill log →
      round win → scoreboard, all inside the container)
- [x] Healthcheck reports `healthy` — observed on the running container
      (`docker inspect --format='{{.State.Health.Status}}'`)
- [x] `docker-compose.yml` pulls `image: ghcr.io/tobciu/curvytron:latest`
      (local `build:` kept as a commented alternative)
- [x] CI workflow builds, tests and smoke-tests on every push; tag → versioned image push
- [x] Old `cyrale/curvytron` base and the `RUN gulp` line are gone
- [x] **First release tagged and published**: `v2.0.0` →
      [`ghcr.io/tobciu/curvytron:2.0.0`](https://github.com/tobciu/curvytron/pkgs/container/curvytron)
      (also `:latest`, `:sha-572544c`) — public package, built by the `docker` CI job,
      pulled and run standalone (no login needed) to verify.
