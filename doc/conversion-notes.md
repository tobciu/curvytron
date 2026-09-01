# ESM/TS conversion notes (Phase 1)

Mechanical rules for turning the concat-globals `src/**/*.js` into ESM/TS modules.
Living document — extended as cases come up.

## Unit of work

- **Standalone pseudo-class** (no sub/superclass in the Curvytron hierarchy, e.g.
  `Collection`, `Compressor`, `BaseTickrateLogger`): convert straight to `class` + ESM
  `export`, delete the `.js`.
- **Hierarchy** (`Base*` + its `client/*` and `server/*` subclasses): convert **all
  members together** in one slice — you cannot `Base.call(this)` a `class`, so a half-
  converted hierarchy does not run. (That's acceptable mid-Phase-1, but keep the slice
  whole.)

## Rules

| Legacy | Becomes |
| --- | --- |
| `function Foo(a){ ... }` + `Foo.prototype.x = ...` | `export class Foo { constructor(a) { ... } x() {} }` |
| `EventEmitter.call(this)` + `Foo.prototype = Object.create(EventEmitter.prototype)` | `import { EventEmitter } from 'eventemitter3'` → `export class Foo extends EventEmitter { constructor() { super(); ... } }` |
| `BaseFoo.call(this, a)` | `super(a)` |
| `BaseFoo.prototype.method.call(this, x)` | `super.method(x)` |
| `Foo.prototype.CONST = 5` (balancing constants) | `readonly CONST = 5` class field (or `static` where it was read via `Foo.prototype.CONST`) |
| `this.cb = this.cb.bind(this)` in ctor | keep as-is for now (callbacks passed to `setTimeout`/events); arrow-field cleanup is Phase 2 |
| bundle-global reference to another class | `import { Other } from './Other.ts'` |
| **Base→concrete-subclass reference** (only 7: `BaseAvatar`→`Trail`/`BonusStack`, `BaseRoom`→`RoomConfig`/`Game`, `BaseGame`→`BonusManager`/`FPSLogger`, `BasePlayer`→`Avatar`) | Base declares an injected class field it `new`s (`protected TrailClass!: typeof BaseTrail`); each concrete subclass assigns the concrete class. |

## Conventions

- **Imports use the explicit `.ts` extension** (`./Foo.ts`) — the bundler (esbuild) and
  Vitest resolve it; `tsc` is `--noEmit` with `allowImportingTsExtensions`.
- **`EventEmitter`**: always the **named** import `import { EventEmitter } from 'eventemitter3'`
  (the default import mis-types as "not a constructor" under `verbatimModuleSyntax`).
- **Timer handles**: `ReturnType<typeof setInterval> | null` (works in Node and browser;
  keeps `src/shared` env-neutral).
- **`src/shared` stays env-neutral**: no `node:*` imports, no DOM. Anything Node- or
  browser-specific lives in `src/server` / `src/client`.
- **Tests** colocate as `*.test.ts` next to the module (or `<group>.test.ts` for a set).
  Every converted module gets at least a smoke test; pure-logic modules get real coverage.
- **Behaviour parity**: port quirks verbatim and pin them in tests (e.g.
  `Collection.map`/`filter` reverse order, `Compressor` truncates negatives toward zero).
  Cleanups wait for Phase 2.

## Progress

| Module / hierarchy | Status |
| --- | --- |
| `shared/Collection` | ✅ `ab91567` |
| `shared/service/Compressor` | ✅ `ab91567` |
| `shared/service/BaseFPSLogger` + `server/service/FPSLogger` | ✅ `acbfa89` |
| `shared/service/BaseTickrateLogger` | ✅ `acbfa89` |
| `shared/core/BaseSocketClient` (+ `SocketLike` iface for the `ws` adapter) | ✅ |
| `shared/model/BaseTrail` + `{client,server}/model/Trail` | ✅ (client Trail has no DOM deps) |
| `shared/model/BaseBonusStack` (base only) | ✅ base |
| **Bonus subsystem** — `shared/model/BaseBonus` + `shared/manager/BaseBonusManager` + `server/model/Bonus/*` (~28) + `server/manager/BonusManager` + `server/model/RoomConfig` + `{client,server}/model/BonusStack` | ⬜ (one cohesive slice — the instance-vs-prototype constant reads are entangled) |
| `shared/model/BasePlayer` + `{client,server}/model/Player` | ⬜ |
| `shared/model/BaseAvatar` + `{client,server}/model/Avatar` | ⬜ |
| `shared/model/BaseRoomConfig` (base only; concrete RoomConfig needs the bonus classes) | ✅ base |
| `shared/model/BaseRoom` + `{client,server}/model/Room` | ⬜ |
| `shared/model/BaseGame` + `{client,server}/model/Game` | ⬜ |
| `shared/service/BaseChat` (base) + `server/service/Chat` | ⬜ |
| `{client,server}/core/SocketClient` (subclasses of the converted BaseSocketClient) | ⬜ |
| `shared/model/Preset` + client presets | ⬜ Phase 2 (client-only UI) |
| `src/server/**` (controllers, core, managers, trackers, launcher→main.ts) | ⬜ |
