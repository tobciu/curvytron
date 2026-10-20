# Development

## Structure

    src
     |- shared  # Base classes that are extended by their equivalent on client and server side
     |- client  # Front-end (Vue 3 + TypeScript, bundled by Vite)
     |- server  # Back-end (Node.js, WebSocket server)
    public      # Static assets (images, fonts, sounds) copied as is to the build
    tests       # Vitest unit / integration tests and Playwright end-to-end tests

### Client

    src/client
     |- main.ts, App.vue, router.ts   # Entry point, root component and routes (hash urls: #/room/name)
     |- views/                        # One component per page: rooms list, room, game, about
     |- components/                   # Profile panel, chat, room parameters, color picker, game widgets
     |- composables/                  # Bridge between the game model and Vue
     |- services.ts                   # Creates the services (socket, profile, chat...) and provides them to the components
     |- styles/                       # SCSS, imported by main.ts
     |- core, model, repository,      # The game itself: plain JavaScript classes (socket client, canvas rendering,
        service, manager, animation   # rooms, games, avatars...), not tied to Vue
     |- lib                           # Small libraries: gamepad, key mapper, sprite loader

The model is made of mutable objects that emit events. Vue can not see changes in them, so components use
`useLive(model, emitter, events)` (see `composables/useEmitter.ts`): the returned ref makes the template render again
each time one of the events is emitted (or `bump()` is called).
`types.ts` describes the part of the model the components rely on.

### Defaults and constants

Default values are class fields (`duration = 4000;`). Constants that are read from outside of the class are `static`
(`Player.maxLength`, `BonusSelfFast.probability`, `BaseAvatar.defaults`). A subclass can override a field, but the
constructor of the base class does not see the override: read it later (methods, not constructor).

### Shared

The shared classes can not reference client or server classes directly: they call factory methods
(`createTrail()`, `createGame()`, ...) that are implemented on each side.

`#event-emitter` is resolved to Node's `EventEmitter` on the server and to `src/client/EventEmitter.js` in the browser.
On the client, listeners receive a DOM-like event (`{ type, detail }`).

## Commands

| Command                      | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                | Start the server with the Vite dev server (hot reload) on port 8080 |
| `npm run build`              | Build the client into `dist/`                                       |
| `npm start`                  | Start the server and serve the built client                         |
| `npm test`                   | Run the unit and integration tests (Vitest)                         |
| `npm run test:e2e`           | Build, then run the browser tests (Playwright)                      |
| `npm run test:visual`        | Build, then compare screenshots of the main screens                 |
| `npm run test:visual:update` | Update the reference screenshots (after an intended design change)  |
| `npm run lint`               | Lint the sources (ESLint)                                           |
| `npm run typecheck`          | Check the types of the `.ts` and `.vue` files                       |
| `npm run format`             | Format the sources with Prettier                                    |

### Tests

    tests
     |- game/    # Game rules on the server side: avatars, world and collisions, bonuses, rounds, rooms, votes
     |- client/  # Client side model (profile, chat, presets), runs in jsdom with the browser event emitter
     |- e2e/     # Playwright: real browsers against a real server, plus screenshot comparisons
     |- *.test.* # Shared code, protocol (real WebSocket server) and color maths

The first time, install the browser used by the end-to-end tests with `npx playwright install chromium`
(or set `CHROMIUM_PATH` to an existing Chromium / Chrome executable).

## Stress test

The stress test creates a room, adds 50 players in it and set them ready so the game launch.
To use it, open your console an run:

```js
var stressTest = document.createElement('script');
stressTest.src = 'stressTest.js';
document.head.appendChild(stressTest);
```
