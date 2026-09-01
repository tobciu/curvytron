# Deployment (Docker image + Compose)

**Target:** CI builds a versioned Docker image and pushes it to a registry; the server runs
it via `docker compose pull && docker compose up -d`. No build toolchain on the deploy host.

Today's `Dockerfile` (`FROM cyrale/curvytron`, global `gulp`) and `docker-compose.yml`
(`build: .`) are replaced as part of roadmap Phase 1 / rewrite-plan Step 0 and Step 7.

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

GitHub Actions (roadmap Phase 5), on push to `main`/`modernize` and on tags:

- `docker/setup-buildx-action` + `docker/build-push-action`
- Tags: `ghcr.io/tobciu/curvytron:latest`, `:<git-sha>`, and `:<semver>` on release tags
- Push to **GHCR** (`GITHUB_TOKEN` has package write) or Docker Hub
- Cache via `type=gha`
- Gate the image build on `lint` + `test` + a headless smoke test passing first

Deploy = on the host: `docker compose pull && docker compose up -d` (or a webhook /
`watchtower` / a small deploy workflow over SSH).

## Migration checklist

- [ ] New multi-stage `Dockerfile` builds locally: `docker build -t curvytron:local .`
- [ ] Container starts, serves the game on `:8080`, WebSocket connects, a 2-player round
      plays (the golden rule, in-container)
- [ ] Healthcheck reports `healthy`
- [ ] `docker-compose.yml` switched to `image:` + `restart: unless-stopped`
- [ ] CI workflow builds and pushes on merge; tag → versioned image
- [ ] Old `cyrale/curvytron` base and the `RUN gulp` line are gone
