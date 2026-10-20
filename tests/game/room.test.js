import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from '../../src/server/model/Room.ts';
import { Player } from '../../src/server/model/Player.ts';
import { KickVote } from '../../src/server/model/KickVote.ts';
import { FloodFilter } from '../../src/server/service/FloodFilter.ts';
import { RoomNameGenerator } from '../../src/server/service/RoomNameGenerator.ts';
import { BonusSelfFast } from '../../src/server/model/Bonus/BonusSelfFast.ts';
import { Collection } from '../../src/shared/Collection.ts';
import { createClient, createGame, place } from '../helpers/game.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('Player', () => {
    const player = new Player(createClient(1), 'Alice', '#ff0000');

    it('accepts hex colors, and refuses colors that are too dark when asked to', () => {
        expect(player.validateColor('#ff0000')).toBe(true);
        expect(player.validateColor('#FFAA00')).toBe(true);
        expect(player.validateColor('ff0000')).toBe(false);
        expect(player.validateColor('#fff')).toBe(false);
        expect(player.validateColor('red')).toBe(false);
        expect(player.validateColor(null)).toBe(false);
        expect(player.validateColor('#101010')).toBe(true);
        expect(player.validateColor('#101010', true)).toBe(false);
    });

    it('picks a random color that is readable on the dark background', () => {
        for (let i = 0; i < 100; i++) {
            expect(player.validateColor(player.getRandomColor(), true)).toBe(true);
        }
    });

    it('gets a random color when none is given or when it is not valid', () => {
        expect(new Player(createClient(1), 'A', 'nope').color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(new Player(createClient(1), 'A').color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(new Player(createClient(1), 'A', '#00ff00').color).toBe('#00ff00');
    });

    it('does not change to a color that is too dark', () => {
        const alice = new Player(createClient(1), 'Alice', '#ff0000');

        expect(alice.setColor('#000000')).toBe(false);
        expect(alice.color).toBe('#ff0000');
        expect(alice.setColor('#00ff00')).toBe(true);
    });

    it('toggles its ready state', () => {
        const alice = new Player(createClient(1), 'Alice', '#ff0000');

        alice.toggleReady();
        expect(alice.ready).toBe(true);
        alice.toggleReady();
        expect(alice.ready).toBe(false);
        alice.toggleReady(true);
        expect(alice.ready).toBe(true);
    });
});

describe('Room', () => {
    function roomWith(...names) {
        const room = new Room('test');
        const players = names.map((name, index) => {
            const player = new Player(createClient(index + 1), name, '#ff0000');

            room.addPlayer(player);

            return player;
        });

        return { room, players };
    }

    it('gives an id to its players and refuses a name twice', () => {
        const { room, players } = roomWith('Alice', 'Bob');

        expect(players[0].id).not.toBe(players[1].id);
        expect(room.isNameAvailable('Alice')).toBe(false);
        expect(room.isNameAvailable('Carl')).toBe(true);
    });

    it('is ready when everybody is ready, and there is no game yet', () => {
        const { room, players } = roomWith('Alice', 'Bob');

        expect(room.isReady()).toBe(false);

        players[0].toggleReady();
        expect(room.isReady()).toBe(false);

        players[1].toggleReady();
        expect(room.isReady()).toBe(true);

        room.newGame().avatars.items.forEach((avatar) => avatar.printManager.stop());
        expect(room.isReady()).toBe(false);
    });

    it('is never ready when empty', () => {
        expect(new Room('empty').isReady()).toBe(false);
    });

    it('creates a single game at a time', () => {
        const { room } = roomWith('Alice', 'Bob');
        const game = room.newGame();

        expect(room.newGame()).toBeNull();
        expect(room.game).toBe(game);
    });

    it('resets the players when the game is over', () => {
        const { room, players } = roomWith('Alice', 'Bob');
        const game = room.newGame();

        players.forEach((player) => player.toggleReady(true));
        game.started = true;
        game.end();

        expect(room.game).toBeUndefined();
        expect(players.every((player) => !player.ready)).toBe(true);
        expect(players.every((player) => player.avatar === null)).toBe(true);
    });

    it('is described for the room list', () => {
        const { room } = roomWith('Alice', 'Bob');

        expect(room.serialize(false)).toEqual({ name: 'test', players: 2, game: false, open: true });
        expect(room.serialize().players).toHaveLength(2);
    });
});

describe('RoomConfig', () => {
    const config = () => new Room('test').config;

    it('has a victory score of ten points per opponent, unless set', () => {
        const room = new Room('test');

        ['A', 'B', 'C'].forEach((name, index) => room.addPlayer(new Player(createClient(index + 1), name, '#ff0000')));

        expect(room.config.getMaxScore()).toBe(20);

        room.config.setMaxScore('7');
        expect(room.config.getMaxScore()).toBe(7);

        room.config.setMaxScore('nope');
        expect(room.config.getMaxScore()).toBe(20);
    });

    it('is open by default, a private room gets a password of four digits', () => {
        const room = config();

        expect(room.allow(null)).toBe(true);

        expect(room.setOpen(false)).toBe(true);
        expect(room.password).toMatch(/^[1-9]{4}$/);
        expect(room.allow(null)).toBe(false);
        expect(room.allow('0000')).toBe(false);
        expect(room.allow(room.password)).toBe(true);

        expect(room.setOpen(false)).toBe(false);
        expect(room.setOpen(true)).toBe(true);
        expect(room.password).toBeNull();
    });

    it('announces when the room is opened or closed', () => {
        const room = config();
        const events = [];

        room.on('room:config:open', (data) => events.push(data.open));
        room.setOpen(false);
        room.setOpen(true);

        expect(events).toEqual([false, true]);
    });

    it('only accepts known variables, between -1 and 1', () => {
        const room = config();

        expect(room.setVariable('bonusRate', 0.5)).toBe(true);
        expect(room.getVariable('bonusRate')).toBe(0.5);
        expect(room.setVariable('bonusRate', 2)).toBe(false);
        expect(room.setVariable('bonusRate', '-1')).toBe(true);
        expect(room.setVariable('nope', 0)).toBe(false);
        expect(room.getVariable('bonusRate')).toBe(-1);
    });

    it('toggles known bonuses and gives the classes of the enabled ones', () => {
        const room = config();
        const total = room.getBonuses().length;

        expect(room.toggleBonus('BonusSelfFast')).toBe(true);
        expect(room.getBonus('BonusSelfFast')).toBe(false);
        expect(room.getBonuses()).toHaveLength(total - 1);
        expect(room.getBonuses()).not.toContain(BonusSelfFast);
        expect(room.toggleBonus('BonusNope')).toBe(false);

        room.setBonus('BonusSelfFast', true);
        expect(room.getBonuses()).toContain(BonusSelfFast);
    });
});

describe('KickVote', () => {
    it('kicks when more than half of the clients voted for it', () => {
        const [target, a, b, c] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
        const vote = new KickVote(target, 4);
        const closed = vi.fn();

        vote.on('close', closed);
        vote.toggleVote(a);
        vote.toggleVote(b);

        expect(vote.result).toBe(false);
        expect(vote.closed).toBe(false);

        vote.toggleVote(c);

        expect(vote.result).toBe(true);
        expect(closed).toHaveBeenCalledOnce();
    });

    it('lets a client withdraw its vote', () => {
        const vote = new KickVote({ id: 1 }, 4);
        const client = { id: 2 };

        vote.toggleVote(client);
        expect(vote.hasVote(client)).toBe(true);

        vote.toggleVote(client);
        expect(vote.hasVote(client)).toBe(false);
    });

    it('closes without result when nobody votes during ten seconds', () => {
        const vote = new KickVote({ id: 1 }, 4);
        const closed = vi.fn();

        vote.on('close', closed);
        vote.toggleVote({ id: 2 });
        vote.toggleVote({ id: 2 });

        vi.advanceTimersByTime(9999);
        expect(closed).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(closed).toHaveBeenCalledOnce();
        expect(vote.result).toBe(false);
    });

    it('is decided again when the number of clients changes', () => {
        const vote = new KickVote({ id: 1 }, 6);

        vote.toggleVote({ id: 2 });
        vote.toggleVote({ id: 3 });
        vote.setTotal(3);

        expect(vote.result).toBe(true);
    });
});

describe('FloodFilter', () => {
    it('lets a client write three messages in two seconds', () => {
        const messages = [];
        const filter = new FloodFilter(messages);
        const send = (client) => {
            const message = { client: { id: client }, creation: Date.now() };

            if (filter.isValid(message)) {
                messages.push(message);

                return true;
            }

            return false;
        };

        expect([send(1), send(1), send(1), send(1)]).toEqual([true, true, true, false]);
        expect(send(2)).toBe(true);

        vi.advanceTimersByTime(2001);

        expect(send(1)).toBe(true);
    });
});

describe('BonusManager', () => {
    it('gives a bonus to the avatar that touches it, once', () => {
        const { game, avatars } = createGame(['Alice', 'Bob']);
        const [alice, bob] = avatars;
        const bonus = new BonusSelfFast(30, 30);
        const popped = vi.fn();
        const cleared = vi.fn();

        game.bonusManager.on('bonus:pop', popped);
        game.bonusManager.on('bonus:clear', cleared);
        game.bonusManager.world.activate();
        game.bonusManager.add(bonus);

        place(alice, 50, 50);
        place(bob, 30.5, 30.5);
        game.bonusManager.testCatch(alice);
        expect(alice.velocity).toBe(16);

        game.bonusManager.testCatch(bob);
        game.bonusManager.testCatch(alice);

        expect(popped).toHaveBeenCalledWith(bonus);
        expect(cleared).toHaveBeenCalledOnce();
        expect(bob.velocity).toBe(28);
        expect(game.bonusManager.bonuses.isEmpty()).toBe(true);

        avatars.forEach((avatar) => avatar.printManager.stop());
    });

    it('only picks bonuses that are enabled in the room, according to their probability', () => {
        const { game, avatars } = createGame(['Alice', 'Bob']);

        game.bonusManager.bonusTypes = [BonusSelfFast];

        expect(game.bonusManager.getRandomBonusType()).toBe(BonusSelfFast);

        game.bonusManager.bonusTypes = [];

        expect(game.bonusManager.getRandomBonusType()).toBeNull();

        avatars.forEach((avatar) => avatar.printManager.stop());
    });

    it('pops bonuses at random times while the game runs, and not more than the cap', () => {
        const { game, avatars } = createGame(['Alice', 'Bob']);

        game.bonusManager.bonusTypes = [BonusSelfFast];
        game.bonusManager.start();
        vi.advanceTimersByTime(10 * 60 * 1000);

        expect(game.bonusManager.bonuses.count()).toBe(game.bonusManager.bonusCap);

        game.bonusManager.stop();
        expect(game.bonusManager.bonuses.isEmpty()).toBe(true);

        avatars.forEach((avatar) => avatar.printManager.stop());
    });
});

describe('RoomNameGenerator', () => {
    it('makes a name out of an adjective and a noun', () => {
        expect(new RoomNameGenerator().getName()).toMatch(/^The \S+( \S+)+$/);
    });
});

describe('Collection', () => {
    it('keeps its items sorted on demand and finds the first match', () => {
        const collection = new Collection([
            { id: 1, v: 2 },
            { id: 2, v: 9 },
            { id: 3, v: 5 }
        ]);

        collection.sort((a, b) => b.v - a.v);

        expect(collection.items.map((item) => item.v)).toEqual([9, 5, 2]);
        expect(
            collection.match(function () {
                return this.v < 6;
            }).v
        ).toBe(5);
    });
});
