# Development

## Structure

    src
     |- shared  # "Abstract" base classes that are extended by their equivalent on client and server side
     |- client  # Client side application (AngularJS app bundled by Vite)
     |- server  # Server side application (Node.js)
    public      # Static assets (images, fonts, sounds) copied as is to the build
    tests       # Vitest tests

Everything is written as ES modules. The shared classes can not reference client or server classes directly:
they call factory methods (`createTrail()`, `createGame()`, ...) that are implemented on each side.

`#event-emitter` is resolved to Node's `EventEmitter` on the server and to `src/client/EventEmitter.js` in the browser.
On the client, listeners receive a DOM-like event (`{ type, detail }`).

## Commands

| Command          | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `npm run dev`    | Start the server with the Vite dev server (hot reload) on port 8080 |
| `npm run build`  | Build the client into `dist/`                                       |
| `npm start`      | Start the server and serve the built client                         |
| `npm test`       | Run the tests                                                       |
| `npm run lint`   | Lint the sources                                                    |
| `npm run format` | Format the sources with Prettier                                    |

## Stress test

The stress test creates a room, adds 50 players in it and set them ready so the game launch.
To use it, open your console an run:

```js
var stressTest = document.createElement('script');
stressTest.src = 'stressTest.js';
document.head.appendChild(stressTest);
```
