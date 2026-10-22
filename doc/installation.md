## Prerequisite

Curvytron runs on [Node.js >= 22.18](https://nodejs.org/) (the server is TypeScript, run directly by Node).
You need to install Node.js on the machine that will run the Curvytron server.

## Installation

**Clone the repository**

    git clone https://github.com/Elao/curvytron.git
    cd curvytron

**Install dependencies**

    npm install

**Build the game**

    npm run build

## Launch server

    npm start

The results of the games (history, statistics) are kept in a SQLite database, `data/curvytron.db` (see
[configuration](configuration.md#storage)). Back it up if you care for it.

## Play

Go to [http://localhost:8080/](http://localhost:8080/)
Join a room, choose a player name and play!

## With Docker

    docker compose up --build -d

The game is then available on [http://localhost:8080/](http://localhost:8080/).
**The games are kept in the volume `curvytron-data`.** Without it (a compose file of your own, `docker run`) the database is
lost when the container is recreated: mount a volume on `/curvytron/data`.

Change the published port in `docker-compose.yml` (e.g. `'3000:8080'`), and mount your `config.json` as shown there if needed.
On a VPS, bind to `127.0.0.1:8080:8080` and put a reverse proxy in front (see [nginx-proxy.md](nginx-proxy.md), websockets must be forwarded).
