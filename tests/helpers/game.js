import { Room } from '../../src/server/model/Room.ts';
import { Player } from '../../src/server/model/Player.ts';
import { Collection } from '../../src/shared/Collection.ts';
import { starChaseMode } from '../../src/server/scoring/StarChaseMode.ts';

/** A client that is not connected to anything: it ignores what is sent to it. */
export function createClient(id) {
    return {
        id,
        active: true,
        players: new Collection([], 'id'),
        on() {},
        off() {},
        removeListener() {},
        addEvent() {},
        addEvents() {},
        isPlaying: () => true
    };
}

/** A room with the given players, and the game created from it (not started). */
export function createGame(names = ['Alice', 'Bob', 'Carl'], configure = null) {
    const room = new Room('test');

    configure?.(room.config);
    const players = names.map((name, index) => {
        const player = new Player(createClient(index + 1), name, '#ff0000');

        room.addPlayer(player);

        return player;
    });
    const game = room.newGame();

    // Star Chase is behind the feature toggle: the game created here would be scored by the classic one.
    // These tests exercise the rules of Star Chase directly, as the game does when the mode is enabled.
    if (room.config.mode === 'starchase') {
        game.scoring = starChaseMode;
        game.warmdownTime = starChaseMode.warmdownTime;
    }

    return { room, game, players, avatars: game.avatars.items };
}

/** Put an avatar somewhere, heading in a direction, as a new round would. */
export function place(avatar, x, y, angle = 0) {
    avatar.setPosition(x, y);
    avatar.setAngle(angle);
}

/** The properties a bonus can change: used to check that a bonus is fully reverted. */
export function snapshot(avatar) {
    const { velocity, radius, inverse, invincible, ghost, directionInLoop, angularVelocityBase, color } = avatar;

    return { velocity, radius, inverse, invincible, ghost, directionInLoop, angularVelocityBase, color };
}
