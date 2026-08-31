## Prerequisite

Curvytron runs on [node.js](https://nodejs.org/). The **built server**
(`node bin/curvytron.js`) runs on current Node (20+).

> ⚠️ The **legacy build** below still uses Gulp 3 + Bower and needs an **old Node
> (~8–10)** — `gulp-sass@0.7` and the `bower install` hook do not work on modern npm/Node.
> Use [`nvm`](https://github.com/nvm-sh/nvm) to select an old Node just for the build.
> Replacing this toolchain is [Phase 1 of the modernization roadmap](modernization-roadmap.md).

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
