# ADR 0001 — Client framework for the rewrite

- **Status:** Accepted
- **Date:** 2026-08-31
- **Deciders:** repo owner (fork `tobciu/curvytron`)
- **Supersedes:** the "keep AngularJS vs. rewrite" open question in
  [`../modernization-roadmap.md`](../modernization-roadmap.md) Phase 4

## Context

The client shell (lobby, room/lobby screen, chat, profile, in-game HUD, routing) is built
on **AngularJS 1.4.3**, which is end-of-life — no security patches, no ecosystem, and
tooling (Gulp 3 / Bower) that no longer runs on current Node. The owner has decided a
**framework rewrite** is required rather than incremental in-place modernization.

Constraints and facts that shaped the choice:

- **Small team** (owner + AI-assisted), hobby/community project — developer throughput and
  low ceremony matter more than hiring-pool size or enterprise governance.
- The **canvas renderer and the shared game logic** (`src/shared/**`, `src/client/core`,
  `src/client/model`) are already framework-agnostic plain classes on an `EventEmitter`.
  The rewrite only touches the DOM shell; whatever framework is chosen must **stay out of
  the game's render loop** (no VDOM diffing at 60 fps).
- State is almost entirely **push** from one WebSocket (`SocketClient` + the `*Repository`
  classes). We need lightweight reactive stores fed by socket events, not a heavy
  client-state framework.
- A previous one-shot attempt (`origin/ai_migrate`, React 19 + Vite + socket.io) stalled —
  not because of React, but because it was a *parallel big-bang* rewrite that also swapped
  the transport and never migrated the server. Lesson: **incremental**, one screen at a
  time, transport handled separately.
- AngularJS templates (directives, `ng-repeat`, two-way bindings, filters) map most
  naturally onto compiler-based, template-first frameworks.

## Options considered

| | Svelte 5 + TS + Vite | React 19 + TS + Vite | Vue 3 + TS + Vite |
| --- | --- | --- | --- |
| Boilerplate / ceremony | lowest (compiler, no VDOM) | highest (hooks, effect rules, memoization) | low–medium |
| Built-in reactive state / stores | yes (`$state`, stores) | no — pick Zustand/Redux/Context | yes (`ref`, Pinia) |
| Runtime weight | minimal (compiles away) | moderate | moderate |
| Fit for "thin DOM around a canvas game" | excellent | good | good |
| Conceptual distance from AngularJS templates | small | larger (JSX) | smallest |
| Ecosystem / hiring pool | smaller | largest | large |
| Owner's stated preference | delegated to recommendation | — | — |

## Decision

**Adopt Svelte 5 + TypeScript, built with Vite**, using Svelte stores as the socket-fed
state layer. No SvelteKit (this is a single SPA served by the existing Node server; a
router library — `svelte-routing` or hand-rolled hash routing to match today's routes —
is enough).

Rationale: for a small team wrapping an already-working, framework-free game engine in a
handful of screens, Svelte gives the least code to write and maintain, needs no extra
state-management dependency, keeps the bundle small, and its templating is the closest
step from the current AngularJS views. The main downside (smaller ecosystem) is low-impact
here — there are no exotic UI requirements, and the heavy lifting (rendering, physics,
networking) is plain TypeScript that any framework would consume identically.

If a mainstream ecosystem / larger contributor pool later becomes the priority, **React**
is the documented fallback; the migration plan ([`../rewrite-plan.md`](../rewrite-plan.md))
is deliberately framework-shaped so the same steps apply.

## Consequences

- New client entry: `src/client/main.ts` + `App.svelte`; Vite replaces the Gulp client
  pipeline (roadmap Phase 1 happens as part of this).
- `src/shared/**`, `src/client/core/*`, `src/client/model/*`, `src/client/animation/*`
  are **kept** and converted to ES modules / TS incrementally; they are imported by Svelte
  components, not rewritten.
- AngularJS, `angular-route`, `angular-cookies`, `angular-bootstrap-colorpicker`,
  `createjs-soundjs` (replace with the Web Audio API or `howler`) are removed by the end.
- Each screen is migrated in its own PR, deleting the matching AngularJS controller/view as
  it lands. Work happens on the `modernize` branch; verification is per-phase, not
  per-commit ([`../pre-implementation-checklist.md`](../pre-implementation-checklist.md)).
- Requires committing to Svelte 5 runes syntax and the Vite toolchain in CI (roadmap
  Phase 5).
- Transport modernization is a **separate** decision — see
  [ADR 0002](0002-websocket-transport.md).
