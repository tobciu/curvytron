# Legacy build & deploy — how it actually works today

The pre-modernization reality, captured so the rewrite has a known-good reference.

## The build only exists inside one Docker image

The legacy toolchain (gulp 3, `gulp-sass@0.7`/old libsass, `bower_components`) **cannot be
reassembled on a normal machine** — the dependency versions are no longer resolvable. It
survives only because the base image **`cyrale/curvytron`** has the entire toolchain +
`node_modules` + `bower_components` pre-installed.

- Base image Node version: **`v0.10.48`** (2015).
  ```
  $ docker exec -it curvytron node --version
  v0.10.48
  ```
- Base image Dockerfile: <https://github.com/cyrale/curvytron/blob/main/Dockerfile>
- This repo's [`Dockerfile`](../Dockerfile):
  ```dockerfile
  FROM cyrale/curvytron
  ENV APP_DIRECTORY /curvytron
  WORKDIR ${APP_DIRECTORY}
  COPY web/images/bonus.png web/images/bonus.png
  COPY src src
  RUN gulp          # uses the base image's global gulp + preinstalled deps
  EXPOSE 8080
  CMD node bin/curvytron.js
  ```
  It drops the current `src/` on top of the frozen toolchain and rebuilds. "Far from
  ideal, but it has worked."

## How the deployed instance is built & run

`isx-curvytron.tobj.de`:

- Image built **once** on the server with `docker build -t curvytron .` (this repo's
  `Dockerfile`), then run and left running since.
- No CI, no registry, no `docker compose` for the app today (`docker-compose.yml` in the
  repo is just `build: .`).
- Update procedure today = rebuild the image on the box and restart the container.

This is the "from" state that [`deployment.md`](deployment.md) replaces (CI builds a
`node:24-alpine` multi-stage image → registry → `docker compose pull && up -d`).

## Reference build (Phase 0 task)

Extract the artifacts the frozen toolchain produces, once, and commit them as the parity
reference. A modernized server (Phase 1) can serve this exact client while the client
rewrite is still in progress.

```bash
# in the running container
docker exec -it curvytron sh -c 'cd /curvytron && gulp'

# copy the build outputs out
mkdir -p doc/reference-build
docker cp curvytron:/curvytron/web/js            doc/reference-build/web-js
docker cp curvytron:/curvytron/web/css/style.css doc/reference-build/style.css
docker cp curvytron:/curvytron/web/index.html    doc/reference-build/index.html
docker cp curvytron:/curvytron/bin/curvytron.js  doc/reference-build/curvytron.js
# optional, for exact dependency versions:
docker cp curvytron:/curvytron/bower_components   doc/reference-build/bower_components
docker exec -it curvytron sh -c 'cd /curvytron && npm ls --depth=0' > doc/reference-build/npm-ls.txt
```

Expected outputs (the "output contract" Phase 1 must reproduce):

| Path | Produced by (gulp task) | Notes |
| --- | --- | --- |
| `web/js/curvytron.js` | `front-min` | client bundle, IIFE-wrapped, minified |
| `web/js/dependencies.js` | `front-expose` | concatenated vendor libs (angular, soundjs, tom32i-*) |
| `web/js/views/**/*.html` | `views` | Angular templates, minified |
| `web/css/style.css` | `sass-min` | compiled + minified SCSS |
| `web/index.html` | `ga` | `src/client/views/index.html` + GA token, minified |
| `bin/curvytron.js` | `server` | server bundle, concatenated (not minified, not wrapped) |

> **Fill in after running:** exact file sizes, `gulp` output/warnings, and the `<script>` /
> `<link>` tags in the produced `web/index.html`.
