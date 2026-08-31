# Game rules & mechanics

Everything the simulation does, with the concrete constants. All logic lives in the
`Base*` classes under [`../src/shared/model/`](../src/shared/model) (shared verbatim by
client and server); the **server is authoritative** and the client re-runs the same code
for local prediction/rendering.

Units are arbitrary "world units". The arena is a square of side `game.size` (see
[Map size](#map-size--spawning)). Positions are floats; on the wire they are multiplied by
100 and rounded (`shared/service/Compressor.js`).

## The tick

- Fixed timestep: `BaseGame.framerate = 1000/60` ms (~60 Hz), driven by `setTimeout`
  (`BaseGame.loop`). `step` passed to `update()` is the real elapsed ms since the last
  frame, so movement is frame-rate independent.
- Each tick `Game.update(step)` (`src/server/model/Game.js`): move every alive avatar,
  test border, test collision, run trail-gap timing, test bonus pickup; if anyone died,
  check for round end.

## Movement

Per avatar (`shared/model/BaseAvatar.js`):

| Property | Default | Meaning |
| --- | --- | --- |
| `velocity` | `16` | speed; internally `velocity/1000` world units per ms |
| `angularVelocityBase` | `2.8/1000` | turn rate (rad/ms) at base speed |
| `radius` | `0.6` | avatar/trail half-width; collision radius |
| `trailLatency` | `3` | most recent trail points that can't kill you |
| `directionInLoop` | `true` | `true` = continuous turning while key held; `false` = fixed-angle step per press (used by "straight angle" bonus) |

- Velocity vector: `velocityX = cos(angle)·v`, `velocityY = sin(angle)·v` with
  `v = velocity/1000`. Position integrates as `x += velocityX·step`.
- Turning: while a direction is held, `angle += angularVelocity·step`.
  `angularVelocity` is `±angularVelocityBase` (sign = turn direction, flipped by
  `inverse`).
- **Speed ↔ turn coupling** (`updateBaseAngularVelocity`): when `velocity` changes, the
  turn rate is rescaled `ratio·base + ln(1/ratio)/1000` where `ratio = velocity/16` — so
  slower avatars turn tighter, faster ones turn wider.
- `setVelocity` floors speed at `velocity/2` (= 8); `setRadius` floors radius at
  `radius/8`.

### Input

Client `PlayerInput` emits `move ∈ {-1, 0/false, 1}` (`-1` left, `1` right, `false` =
release) whenever the pressed-keys state changes — **edge-triggered, not per frame**.
`GameController.onMove` calls `avatar.updateAngularVelocity(move)` on the server. Default
keyboard binding is arrow keys (`[37, 39]`); gamepad axes/buttons and left/right screen-half
touch are also supported. Inputs are only meaningful once the round is running.

## Trail & "printing"

The trail is the list of points an avatar has laid down (`shared/model/BaseTrail.js`,
just a `points: [[x,y], ...]` buffer). Whether new points are solid is the "printing"
state, timed by the **server-only** `PrintManager` (`src/server/manager/PrintManager.js`):

| Property | Value | Meaning |
| --- | --- | --- |
| `printDistance` | `60` | nominal solid-segment length |
| `holeDistance` | `5` | nominal gap length |

- Actual lengths are randomised each toggle: solid = `60·(0.3 + rand·0.7)`,
  gap = `5·(0.8 + rand·0.5)`.
- `PrintManager` accumulates travelled distance each tick and toggles `printing` when the
  budget runs out (`avatar.setPrinting(...)`). Turning printing **off** clears the local
  trail buffer.
- Printing starts **3 s after** `game:start` (`Game.onStart` schedules
  `printManager.start` with `setTimeout(..., 3000)`), giving players a safe lead-in.
- `trailLatency = 3`: your own last 3 points never kill you.
- Avatars emit `point` events as they move; `Game.onPoint` turns each into an
  `AvatarBody` inserted into the collision `World`. "important" points (state changes) are
  also forwarded to clients as the `point` event so they can start a new trail segment.

## Collision & death

In `Game.update` per alive avatar (`src/server/model/Game.js`):

1. **Border.** `world.getBoundIntersect(avatar.body, margin)` where `margin` is `0` if the
   game or the avatar is *borderless*/`ghost`, else `avatar.radius`.
   - borderless / ghost → teleport to the opposite edge (`world.getOposite`).
   - otherwise → **death** (no killer).
2. **Trail / body.** if not `invincible`, `world.getBody(avatar.body)` looks up the
   spatial grid for an overlapping `AvatarBody`; a hit → **death**, `killer` = the owner
   of that body (may be yourself).
3. Death: `avatar.die(killer)` → `alive = false`, bonus stack cleared, a final point added;
   the avatar is pushed to `game.deaths`; `deathInFrame = true`.

Collision grid (`src/server/core/World.js` → `Island.js` → `Body`/`AvatarBody`):
`World` is a grid of `Island`s (`islandGridSize = 40` → island side `size/round(size/40)`).
Each body is registered into the up-to-4 islands its bounding box touches; lookups only
test bodies in the relevant island(s). `World.active` gates insertion (off during
warmup/warmdown).

## Scoring & rounds

Round lifecycle (`shared/model/BaseGame.js` + `src/server/model/Game.js`):

```
newRound() → onRoundNew (place avatars, clear world, clear bonuses)
           → start() after warmupTime (3000 ms)
           → loop ... deaths accumulate ...
           → last living avatar dies → endRound()
           → onRoundEnd → resolveScores()
           → stop() after warmdownTime (5000 ms)
           → onStop → isWon() ? end() : newRound()
```

| Constant | Value |
| --- | --- |
| `warmupTime` | `3000` ms |
| `warmdownTime` | `5000` ms |
| `spawnMargin` | `0.05` (fraction of arena kept clear of borders at spawn) |
| `spawnAngleMargin` | `0.3` (spawn heading is biased away from walls) |

**Points during a round** — when avatar *A* dies and there are `score` avatars already in
`game.deaths`, `A` gets `+score` (`Game.kill` → `avatar.addScore(score)`). Net effect:
die first → 0, die second → 1, ... survive longest → most. These go to `roundScore`.

**Round winner** (`resolveScores`): the last avatar still `alive` (or the only avatar) gets
`+max(avatarCount - 1, 1)` and is the `roundWinner`. Then every avatar's `roundScore` is
folded into `score` (`resolveScore`).

**Leader marker:** at `onRoundNew`, if the top score is non-zero, every avatar tied for it
gets `borderColor = '#FFD700'` (gold) for the next round.

**Game end / win** (`Game.isWon`):

- `present <= 0` → game over, no winner.
- more than one avatar total but `present <= 1` → game over (last one standing wins by
  default elsewhere).
- otherwise: avatars with `score >= maxScore` — none → keep playing; exactly one → winner;
  several → the single highest wins, **unless the top two are tied**, in which case play
  continues.

**`maxScore`** (`shared/model/BaseRoomConfig.js`): room-master override, else default
`max(1, (playerCount - 1) · 10)`.

## Map size & spawning

`BaseGame.getSize(players)` (`shared/model/BaseGame.js`):

```
square = 80 · 80                       (perPlayerSize = 80)
size   = round( sqrt( square + (players - 1) · square / 5 ) )
```

→ 1 player ≈ 80, 2 ≈ 87, 5 ≈ 110, 10 ≈ 143. Recomputed after a game when the present-player
count changed; changing size rebuilds the `World`.

Spawn (`Game.onRoundNew`): each present avatar gets `world.getRandomPosition(radius,
spawnMargin)` (a free point away from borders and existing bodies) and
`world.getRandomDirection(x, y, spawnAngleMargin)` (heading biased inward). Absent players
are dropped straight into `deaths`.

## Bonuses

### Lifecycle

- `BonusManager` (`src/server/manager/BonusManager.js`, extends
  `shared/manager/BaseBonusManager.js`) runs its own `setTimeout` chain while a round is
  live.
- Spawn cadence: `bonusPopingTime = 3000` ms, each wait multiplied by `1 + rand` (so
  3–6 s). The room `bonusRate` variable (−1…1) shrinks it: `3000 − 1500·rate`.
- Cap: `bonusCap = 20` simultaneous bonuses.
- Position: random free point, `bonusPopingMargin = 0.01` of arena from trails; radius `3`.
- On spawn → `bonus:pop`; on pickup or round end → `bonus:clear`.
- Pickup: `testCatch(avatar)` each tick — if the avatar body overlaps a bonus body,
  `bonus.applyTo(avatar, game)`.

### Which bonus pops — weighted random

`getRandomBonusType()` asks every enabled type for `getProbability(game)` and picks by
cumulative weight. Base `probability = 1`. Types can make their weight **dynamic**:

- **`BonusGameClear`**: weight `= round((1 − aliveRatio)·10)/10` — likelier the more players
  are already dead; `0` while everyone's alive.
- **`BonusLeader*`**: weight `0` unless there's a clear leader with `score > 0`, else `0.5`.

### Effect model

`Bonus` (`src/server/model/Bonus/Bonus.js`) resolves a **target** via `getTarget()`, then
`on()`; if `duration > 0` it schedules `off()` after `duration` (`BaseBonus.duration =
5000` ms default). Most bonuses push themselves onto the target's `bonusStack`
(`shared/model/BaseBonusStack.js`), which merges stacked effects and emits `change`
(→ `bonus:stack` on the wire). `getEffects(avatar)` returns `[[property, value], ...]`
pairs the stack applies (e.g. `velocity`, `radius`, `angularVelocityBase`, `inverse`,
`invincible`, `color`, `directionInLoop`).

### Targeting groups (`affect`)

| Group | Target |
| --- | --- |
| `self` | the avatar who picked it up |
| `enemy` | every **other** alive avatar |
| `leader` | the highest-scoring alive avatar(s), excluding the picker |
| `game` | the game itself (e.g. borderless, clear all trails) |
| `all` | everyone |

### Catalogue

The enabled set per room is `RoomConfig.bonusTypes` /
`BaseRoomConfig.bonuses` (`src/server/model/RoomConfig.js`,
`src/shared/model/BaseRoomConfig.js`). Effects are in each
`src/server/model/Bonus/Bonus*.js`. Summary:

| Bonus | Affect | Effect | Duration | Default |
| --- | --- | --- | --- | --- |
| `BonusSelfSmall` | self | radius ×⅓ | 5 s | on |
| `BonusSelfSlow` | self | velocity ×0.5 | 5 s | on |
| `BonusSelfFast` | self | velocity ×0.75 | 4 s | on |
| `BonusSelfMaster` | self | invincible + ghost (pass through) | 5 s | on |
| `BonusSelfBorderless` | self | borderless for this avatar | 5 s | on |
| `BonusSelfSmall`/`…Slow`/`…Fast`/`…Master`/`…Borderless` **Random** siblings | self | random one of the self effects | varies | off (Random) |
| `BonusEnemySlow` | enemy | enemies velocity ×0.5 | 5 s | on |
| `BonusEnemyFast` | enemy | enemies velocity ×… (faster, harder to control) | 5 s | on |
| `BonusEnemyBig` | enemy | enemies radius ×3 | 5 s | on |
| `BonusEnemyInverse` | enemy | enemies' controls inverted | 5 s | on |
| `BonusEnemyStraightAngle` | enemy | enemies turn in fixed 90°-ish steps (`directionInLoop = false`) | 5 s | on |
| `BonusEnemyRandom` | enemy | random enemy effect | varies | off |
| `BonusLeaderFast` / `…Slow` / `…Inverse` | leader | speed / invert the leader | 5 s | on |
| `BonusLeaderRandom` | leader | random leader effect | varies | off |
| `BonusAllColor` | all | everyone's trail colour changes (visual confusion) | 5 s | on |
| `BonusGameBorderless` | game | walls off, wrap around | 5 s | on |
| `BonusGameClear` | game | wipes **all** trails instantly | instant | on |

(Exact multipliers live in the `getEffects` of each file; the "Random" variants pick a
sibling effect at spawn/apply time.)

### Presets (client-side convenience)

The room-config UI ("BONUS" panel — see
[`images/lobby-with-config-panel.png`](images/lobby-with-config-panel.png)) offers presets
that bulk-toggle the per-bonus switches. They are **client-only** lists of bonus class
names (`src/client/model/preset/*`, base `src/shared/model/Preset.js`); picking one sends
the corresponding `room:config:bonus` toggles. `RoomConfigController` shows **CUSTOM** when
the current on/off set matches no preset.

| Preset (UI label) | Class | Contents |
| --- | --- | --- |
| All | `DefaultPreset` | the 12 "default-on" bonuses |
| Speed of light | `SpeedPreset` | `BonusSelfFast`, `BonusEnemyFast` |
| Super size me | `SizePreset` | size-related bonuses |
| Solo | `SoloPreset` | self + game bonuses only (`Small/Slow/Fast/Master`, `Borderless`, `Clear`) |
| No bonuses | `EmptyPreset` | none |
| Random | `RandomPreset` | a random subset, **recomputed each time it's selected** |
| Custom | `CustomPreset` | whatever is currently toggled |

The "Bonus quantity" slider in that panel is the `bonusRate` room variable (−1…1) from
[the config rules above](#room--lobby-rules) / [`protocol.md`](protocol.md)
(`room:config:variable`).

## Room / lobby rules

| Rule | Where | Value |
| --- | --- | --- |
| Min players to start | `BaseRoom.minPlayer` | `1` |
| Room name max length | `BaseRoom.maxLength` | `25` |
| Player name max length | `BasePlayer.maxLength` | `25` |
| Colour format | `BasePlayer.validateColor` | `#rrggbb`; must pass a YIQ brightness check (`ratio > 0.3`) so it's visible |
| Chat message max length | `Message.maxLength` | `140` |
| Launch countdown (master "start") | `BaseRoom.launchTime` | `5000` ms |
| Auto-launch | `RoomController.onReady` | when **all** players in the room are `ready` |
| Empty-room close delay | `RoomController.timeToClose` | `10000` ms |
| Loading-players grace before a round | `GameController.waitingTime` | `30000` ms |
| Kick vote passes | `KickVote.check` | `votes > total/2`; room master kicks instantly |
| Kick vote auto-close when empty | `KickVote.timeToClose` | `10000` ms |
| Private room password | `BaseRoomConfig` | 4 random digits, generated when room set to closed |
| Ping interval | `server/core/SocketClient.pingInterval` | `1000` ms |

Rooms are created on demand with a random generated name if none given
(`RoomRepository` + `service/RoomNameGenerator`); a room closes (and disappears from the
list) once empty for `timeToClose`.
