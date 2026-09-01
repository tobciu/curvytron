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

- Image built **once** on the server (`docker build -t curvytron-nbx .` from this repo's
  `Dockerfile`), then run and left running since.
- No CI, no registry. The actual compose file on the box:
  ```yaml
  services:
    curvytron:
      container_name: curvytron
      image: curvytron-nbx:latest
      volumes:
        - ./curvytron_data/config.js:/curvytron/bin/config.js
  ```
  (the repo's committed `docker-compose.yml` — `build: .` — is not what runs).
- Update procedure = rebuild the image on the box and restart.

### Config on the deployed box

A `config.js` is mounted to `/curvytron/bin/config.js` with **all-default values**:

```json
{ "port": 8080, "googleAnalyticsId": null,
  "inspector": { "enabled": false, "host": "127.0.0.1", "port": 8086,
                 "username": "root", "password": "root", "database": "curvytron" } }
```

Note the mismatch: `src/server/launcher.js` does `require('../config.json')` (→
`/curvytron/config.json` from the bundled `bin/curvytron.js`), **not** `bin/config.js`. So
the mount is effectively inert and the server runs on its built-in fallback
(`{ port: 8080, inspector: { enabled: false } }`) — which happens to equal the mounted
values. **Takeaway for Phase 1:** the deployed config is 100% defaults; the new launcher
should read a clearly-documented path **plus env vars** (`PORT`, `GA_ID`, `INSPECTOR_*`),
env taking precedence.

This is the "from" state that [`deployment.md`](deployment.md) replaces (CI builds a
`node:24-alpine` multi-stage image → registry → `docker compose pull && up -d`).

## Output contract (verified against the deployed `index.html`)

The built `web/index.html` is ~3.5 KB, minified, `<body ng-app="curvytronApp"
ng-controller="CurvytronController">`, and references exactly:

| Kind | Reference |
| --- | --- |
| script | `js/dependencies.js` |
| script | `js/curvytron.js` |
| stylesheet | `css/style.css` |
| stylesheet | `//fonts.googleapis.com/css?family=Lato:300,400,700` (external) |
| icon | `images/favicon.png` |
| author | `humans.txt` |

No GA snippet (config `googleAnalyticsId` is null). Angular loads `js/views/**/*.html` at
runtime. Full asset list: [`assets.md`](assets.md).

## Reference build — ✅ done

Extracted to [`reference-build/`](reference-build/) (see its `README.md` for file sizes and
the full locked-version table). Built with `docker build -t curvytron-ref:legacy .` then
`docker cp`. Key facts: Node `v0.10.48`, gulp `3.9.1`; `gulp jshint` prints ~10 errors
(single-quote / `eqeqeq` / semicolon / constructor-case in `RoomConfigController`,
`RandomPreset`, `stressTest.js`, server `BonusManager`) but gulp 3 does **not** fail the
build on them. Client bundle 124 KB, deps 237 KB, server bundle 177 KB, CSS 136 KB,
`index.html` 3.5 KB.

<details><summary>Original extraction procedure (for re-running against a live container)</summary>

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

</details>
