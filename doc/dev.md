# Development

See also [`architecture.md`](architecture.md) for the full picture and
[`../CLAUDE.md`](../CLAUDE.md) for contributor working notes.

## Structure

    src
     |- shared  # "Abstract" super class that are meant to be extended by their equivalent on client and server side
     |- client  # Client side application
     |- server  # Server side application

### Bundle model (important)

There is **no module system** in `src/`. `gulp` concatenates files — the include lists and
order live in [`../recipes/client.json`](../recipes/client.json) and
[`../recipes/server.json`](../recipes/server.json) — and wraps the client output in a
single IIFE. Every class is therefore a **global symbol** inside its bundle, and a new file
placed under a globbed path (`src/shared/**`, `src/client/**`, `src/server/**`) is picked
up automatically. Reference other classes from inside methods/constructors, not at file
top level, to stay independent of glob order.

## Automatic build

You can automatically watch for changes in the sources and have gulp rebuild the game on the fly.
Launch gulp watch task with:

    gulp watch

## Stress test

The stress test creates a room, adds 150 players in it and set them ready so the game launch.
Tu use it, open your console an run:

```js
var stressTest = document.createElement('script');
stressTest.src = 'js/stressTest.js';
document.head.appendChild(stressTest);
```
