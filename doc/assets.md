# Asset inventory

Every static asset the client needs, and what the rewrite does with it. All live under
[`web/`](../web) and are served by `express.static`.

## Runtime asset set (from the deployed `index.html`)

The built `web/index.html` (minified, ~3.5 KB) loads exactly:

```html
<link rel="icon" type="image/png" href="images/favicon.png">
<link href="//fonts.googleapis.com/css?family=Lato:300,400,700" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
<script src="js/dependencies.js"></script>
<script src="js/curvytron.js"></script>
<body ng-app="curvytronApp" ng-controller="CurvytronController">
```

Plus, loaded on demand:

- `web/js/views/**/*.html` — Angular templates (`templateUrl: 'js/views/…'`)
- `web/images/logo.svg`, `web/images/bonus.png`, `web/images/tuto/{turn,death,bonus}.gif`
- `web/sounds/*` (see below)
- `web/font/curvytron.{eot,woff,ttf,svg}` (see below)
- external: **Google Fonts – Lato** 300/400/700 (the only third-party asset host)

The GA snippet is **not** present (deployed `config` has `googleAnalyticsId: null`).

## Bonus sprite sheet — `web/images/bonus.png`

- Instantiated once: `new SpriteAsset('images/bonus.png', 3, 7, onLoad, true)` in
  `src/client/manager/BonusManager.js`.
- Grid: **3 columns × 7 rows = 21 cells** (2 cells unused — 19 bonus types).
- The 5th arg `random = true` → `SpriteAsset.getImages()` **shuffles the cells** before
  they are assigned to bonus types (`assets[spritePosition[i]] = images[i]`). **The
  bonus → icon mapping is randomised per page load** — a deliberate mechanic (you can't
  memorise "green diamond = fast"). The rewrite **must preserve this shuffle**.
- Designed cell order (`BonusManager.spritePosition[]`, i.e. the *sheet* layout, before
  shuffle):

  | # | Bonus | # | Bonus | # | Bonus |
  | --- | --- | --- | --- | --- | --- |
  | 0 | BonusSelfFast | 7 | BonusAllColor | 14 | BonusEnemyRandom |
  | 1 | BonusEnemyFast | 8 | BonusEnemyInverse | 15 | BonusLeaderFast |
  | 2 | BonusSelfSlow | 9 | BonusSelfSmall | 16 | BonusLeaderInverse |
  | 3 | BonusEnemySlow | 10 | BonusGameClear | 17 | BonusLeaderSlow |
  | 4 | BonusGameBorderless | 11 | BonusEnemyStraightAngle | 18 | BonusSelfBorderless |
  | 5 | BonusSelfMaster | 12 | BonusSelfRandom | | |
  | 6 | BonusEnemyBig | 13 | BonusLeaderRandom | | |

- Colour convention in the sheet (visible in the config panel): green = self, red = enemy,
  yellow = leader, plus game/all. The `?`-marked cells are the `*Random` types.
- Rewrite: keep `bonus.png` as-is; port `SpriteAsset` (canvas slicing + shuffle) to
  `src/client/lib/SpriteAsset.ts`.

## Sounds — `web/sounds/`

Registered in `src/client/service/SoundManager.js` (via `createjs.Sound`), directory
`sounds/`, `.ogg` primary with `.mp3` fallback (`alternateExtensions = ['mp3']`),
default volume `0.5`:

| id | files | trigger |
| --- | --- | --- |
| `death` | `death.{ogg,mp3}` | local player dies |
| `win` | `win.{ogg,mp3}` | round/game won |
| `notice` | `notice.{ogg,mp3}` | notifier (e.g. it's your turn / chat while away) |
| `bonus-pop` | `bonus-pop.{ogg,mp3}` | a bonus appears |
| `bonus-clear` | `bonus-clear.{ogg,mp3}` | a bonus is picked up / cleared |

Also present but **not registered**: `tap.{ogg,mp3}` (unused).

Rewrite: `SoundManager` becomes a plain module over the **Web Audio API** (decode the 5
`.ogg`/`.mp3` into buffers, `play(id)` / global mute). Keep the files.

## Icon font — `web/font/curvytron.{eot,woff,ttf,svg}`

- Fontello-generated (PUA codepoints `\e800`–`\e819`), declared in
  `src/sass/base/_font.scss`, used as `<i class="icon-…">`.
- **26 glyphs defined:** `crown, volume-off, volume-up, kick, viewer, clock, dead, lock,
  reddit, cog, spectate, love, twitter, github, params, edit, game, check, close, plus,
  angle-right, trophy, minus, megaphone, music, mute`.
- **Referenced but undefined** (pre-existing bug — render nothing): `icon-radio`,
  `icon-volume`, `icon-left-dir`, `icon-right-dir`.
- Rewrite: **replace with inline SVG** — 26 icons is a small `<Icon name="…">` Svelte
  component + an SVG sprite/map. Fix the 4 missing names while doing it. The `.eot/.ttf/.svg`
  formats are obsolete anyway.

## Images

| File | Use |
| --- | --- |
| `web/images/logo.svg` | header logo |
| `web/images/favicon.png` | favicon |
| `web/images/bonus.png` | bonus sprite sheet (above) |
| `web/images/tuto/{turn,death,bonus}.gif` | the 3 animated "how to play" thumbnails on the homepage |

All kept as-is; `bonus.png` is the only one with logic attached.
