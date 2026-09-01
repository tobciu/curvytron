## Prerequisite

Curvytron runs on [node.js](https://nodejs.org/). The **built server**
(`node bin/curvytron.js`) runs on current Node.

> ⚠️ The **legacy build** below cannot be reproduced on a normal machine — the Gulp 3 +
> `bower_components` toolchain only exists inside the `cyrale/curvytron` Docker image
> (Node `v0.10.48`). See [`legacy-build-notes.md`](legacy-build-notes.md). Replacing it is
> [Phase 1 of the modernization roadmap](modernization-roadmap.md).

## Installation

__Clone the repository__

    git clone https://github.com/Elao/curvytron.git
    cd curvytron

__Install dependencies__

    npm install
    bower install

__Build the game__

    gulp

## Launch server

    node bin/curvytron.js

## Play

Go to [http://localhost:8080/](http://localhost:8080/)
Join a room, choose a player name and play!
