# Reference build (Phase 0 snapshot)

The output of the **frozen legacy toolchain**, extracted once so the modernization has a
byte-level reference and a fallback client to serve during the rewrite.

- **Do not edit.** Regenerate only if the legacy `src/` changes (it shouldn't).
- Produced by: `docker build -t curvytron-ref:legacy .` (this repo's `Dockerfile`,
  `FROM cyrale/curvytron`), then `docker cp` of `/curvytron/{web/js,web/css,web/index.html,bin}`.
- Build host: **Node `v0.10.48`**, gulp `3.9.1`, inside the `cyrale/curvytron` image.
- `gulp jshint` reports ~10 lint errors (single-quote / `===` / semicolon / constructor
  case in `RoomConfigController`, `RandomPreset`, `stressTest.js`, server `BonusManager`);
  gulp 3's reporter does **not** fail the build, so these ship. The Phase-1 ESLint config
  should not choke on them either (fix or ignore per-line).

## Files

| File | Bytes | Serves as |
| --- | --- | --- |
| `js/curvytron.js` | 124,375 | client bundle (minified IIFE) — `web/js/curvytron.js` |
| `js/dependencies.js` | 237,485 | vendor concat — `web/js/dependencies.js` |
| `js/views/**/*.html` | — | 8 Angular templates (loaded at runtime) |
| `style.css` | 135,711 | `web/css/style.css` |
| `index.html` | 3,476 | `web/index.html` |
| `curvytron.js` | 177,444 | server bundle — `bin/curvytron.js` |

## Locked dependency versions (from the container)

| npm (server + build) | | bower (client) | |
| --- | --- | --- | --- |
| express | 4.16.2 | angular | 1.4.3 |
| faye-websocket | 0.10.0 | angular-route | 1.4.14 |
| influx | 4.2.3 | angular-cookies | 1.4.14 |
| MD5 | 1.3.0 | angular-bootstrap-colorpicker | 3.0.32 |
| usage | 0.7.1 | createjs-soundjs | 0.6.1 |
| gulp | 3.9.1 | html5-boilerplate | 4.3.0 |
| gulp-sass | 0.7.3 | tom32i-event-emitter.js | 0.1.0 |
| gulp-uglify | 0.3.2 | tom32i-key-mapper.js | 0.1.2 |
| gulp-concat | 2.6.1 | tom32i-gamepad.js | 0.1.0 |
| gulp-wrap | 0.11.0 | tom32i-asset-loader.js | 0.0.2 |
| gulp-html-minifier | 0.1.8 | tom32i-option-resolver.js | 0.0.2 |

## Using it

- **Phase 1/2 verification:** a modernized Node 24 server can serve `js/`, `style.css`,
  `index.html` (rename these back into a `web/` tree) as the working client while the
  Svelte client is built.
- **Diff target:** compare a new server bundle's behaviour against `curvytron.js`; compare
  a new client build's `index.html` script/link set against `index.html`.
