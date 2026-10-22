# Party mode (draft)

Status: idea and plan, nothing is implemented. Open questions are at the end.

## Idea

An alternative way to score a game, like the stars of Mario Party: driving well stays the base, but it is not enough
any more. A player also has to take care of other things: collect bonuses even when they do not want to, drive riskier,
chase the leader.

There is **one score** only (no second currency). That keeps `PlayerList`, the ranking and the end of the game as they
are. The stars are only a special source of points with a high value.

## Where we start

- **Points today**: every death gives points by order (`Game.kill`, number of avatars already dead), the winner of the
  round gets n-1 more (`resolveScores`). The first to reach `maxScore` wins the game (`isWon`).
- **Bonuses**: `BonusManager.testCatch` emits `bonus:catch`, `GameStats` already listens to it.
- **Statistics**: `GameStats` counts over the whole game. Per round there is only the winner and the duration
  (`rounds[]`). Values per round are already in `doc/todo.md` and are the first step for this mode.
- **Skill measures**: near misses and squeezes exist (`testSurroundings`), nothing counts while an avatar is invincible.
- **Pause between rounds**: `warmdownTime = 5000`, `warmupTime = 3000` (`BaseGame`). The awards are shown at the end of
  the game only, because 5 s are too short to read them.
- **Display**: `PlayerList.vue` shows `+roundScore` and `score`.

## Sources of points in party mode

### 1. Round missions ("bonus stars" after the round)

- At the start of a round 2 missions are drawn from a pool and shown to everybody.
- After the round the best player of a mission gets a star, worth about 3 points.
- The missions are **announced** before the round (Mario Party reveals them at the end). That changes the behavior:
  people drive close to trails or hunt bonuses although they would play safe otherwise.
- Tie: all the tied players get the star. Value 0: nobody gets it.

Pool:

| Mission | Measure |
|---|---|
| Close combat | most near misses |
| Needle's eye | most squeezes |
| Collector | most bonuses caught |
| Hunter | most kills on one's own trail |
| Wall rider | longest time close to the wall without dying |
| Marathon | longest distance |
| Kamikaze | first to die, but takes somebody with them |
| Comeback | wins a round after being last in the one before |
| Tough | survives with at least 2 malus bonuses of enemies |

### 2. Star item in the field

- A new bonus type "Star" (through the bonus registry, see `doc/bonuses.md`), no effect, +2 points when caught.
- Rare: at most 1 or 2 per round, and placed on purpose at risky places (close to the wall or to trails) instead of
  equally spread like the normal bonuses. That needs its own placement next to `BonusManager.getRandomPosition`.
- It forces people to join in. Open: does it disappear after some time (more pressure)?

### 3. How the game is won

- A fixed number of rounds (for example 8) instead of `maxScore`: the length can be planned and the suspense stays
  until the end, because stars can change everything.
- Finale: in the last 2 rounds everything counts double.

## More ideas, ordered by effort

| Idea | Effect | Effort |
|---|---|---|
| Overlay between rounds with the breakdown of the points (place, missions, star) and a longer pause (8-10 s), in this mode only | visibility, drama | low |
| Help for the last ones: better bonus chances through `getProbability` | no frustration, close races | low |
| The leader wears the crown (the golden border exists already) | everybody hunts the leader | exists |
| Thief bonus: takes 1 point from the leader | drama | medium |
| Chaos round (a random bonus effect every few seconds) | variety | medium |
| Hidden mission (visible for one player only) | Mario Party feeling | higher |
| Bets: before the round, put 1 point on the winner | the dead stay involved | higher |

Proposal for the start: missions, star item and overlay.

## Implementation (rough)

1. **Statistics per round**: `GameStats` gets a `round` object per player next to the totals, reset in `onRoundStart`
   (this is the open item of `doc/todo.md`). New counters: time close to the wall, place in the round, malus bonuses
   survived, order of the deaths.
2. **Scoring as a strategy**: an interface `ScoringMode` (`classic`, `party`) with the hooks `onKill`,
   `onBonusCatch` and `onRoundEnd`. `Game.resolveScores` and `isWon` hand over to it. The classic mode does not change.
3. **Missions module**: the pool, the draw depending on the number of players (squeezes make no sense with 2 players)
   and the evaluation at the end of the round.
4. **Room setting**: mode `classic` / `party` and the number of rounds in `BaseRoomConfig` and in the room parameters.
5. **Protocol** (`src/shared/protocol.ts`): `round:missions` (start) and `round:summary` (end, with the breakdown per
   player). Reconnect and late join must carry the state: a player that comes back in the middle of a round sees the
   current missions, and `present` / `away` stay right in the evaluation.
6. **Client**: display of the missions in the game, overlay between the rounds, sprite of the star (`npm run sprite`).
7. **Tests**: missions with a tie, players that leave or join, reconnect in the middle of a round, an e2e run of the mode.

## Risks

- **Farming**: near misses can be provoked on purpose. Counter: a cap per round, only the best gets the star, nothing
  counts while invincible (already so).
- **Readability**: too many sources dilute the feeling "who was better". Hence only 2 missions and a clear breakdown.
- **Number of players**: with 2 players the missions are weak. A smaller pool or 1 mission only.

## Open questions

1. **Win**: fixed number of rounds (can be planned) or still the first to reach a score?
2. **Missions**: announced before the round (changes the behavior) or revealed at the end (surprise)? Proposal: announce.
3. **Star item**: in addition to the missions, or left out for the first version?
4. **Pause**: 8-10 s in party mode only, or a longer pause for all the modes?

## Suggested order

1. Statistics per round (useful without the new mode).
2. `ScoringMode` interface, the classic mode behind it, unchanged and tested.
3. Missions + room setting + protocol.
4. Overlay between the rounds.
5. Star item.
6. Further ideas from the table.
