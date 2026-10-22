import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '#event-emitter';
import { RoomRepository } from '../../src/client/repository/RoomRepository.ts';
import { GameRepository } from '../../src/client/repository/GameRepository.ts';
import { RoomsRepository } from '../../src/client/repository/RoomsRepository.ts';
import { Player } from '../../src/client/model/Player.ts';
import { Client } from '../../src/client/model/Client.ts';
import { Collection } from '../../src/shared/Collection.ts';

/** Stand-in for the client socket: records outgoing events and lets tests deliver server events */
class FakeSocketClient extends EventEmitter {
    id: number | null = 1;
    connected = true;
    sent: Array<{ name: string; data: any; callback?: (...args: any[]) => any }> = [];

    addEvent(name: string, data?: any, callback?: (...args: any[]) => any) {
        this.sent.push({ name, data: data ?? undefined, callback });
    }

    /** Last sent event with the given name (fails the test when nothing was sent) */
    last(name: string) {
        const event = [...this.sent].reverse().find((sent) => sent.name === name);

        if (!event) {
            throw new Error(`No "${name}" event was sent.`);
        }

        return event;
    }

    /** Answer the last sent event with the given name */
    answer(name: string, reply: any) {
        this.last(name)!.callback?.(reply);
    }

    /** Deliver an event from the server (client listeners receive `{ type, detail }`) */
    receive(name: string, detail: any) {
        this.emit(name, detail);
    }
}

describe('RoomsRepository', () => {
    let client: FakeSocketClient;
    let rooms: RoomsRepository;

    beforeEach(() => {
        client = new FakeSocketClient();
        rooms = new RoomsRepository(client as any);
        rooms.start();
    });

    it('fetches the list when connected, and waits for the connection otherwise', () => {
        rooms.start();

        expect(client.last('room:fetch')).toBeDefined();

        client = new FakeSocketClient();
        client.connected = false;
        rooms = new RoomsRepository(client as any);
        rooms.start();

        expect(client.sent).toHaveLength(0);

        client.connected = true;
        client.emit('connected', undefined);

        expect(client.last('room:fetch')).toBeDefined();
    });

    it('tracks rooms as they open and close', () => {
        const opened = vi.fn();
        const closed = vi.fn();

        rooms.on('room:open', opened);
        rooms.on('room:close', closed);

        client.receive('room:open', { name: 'arena', players: 3, game: 1, open: true });
        client.receive('room:open', { name: 'arena', players: 3, game: 1, open: true });
        client.receive('room:close', { name: 'arena' });
        client.receive('room:close', { name: 'ghost' });

        expect(opened).toHaveBeenCalledTimes(1);
        expect(closed).toHaveBeenCalledTimes(1);
        expect(rooms.all().count()).toBe(0);
    });

    it('updates players, game and openness of known rooms only', () => {
        const players = vi.fn();
        const game = vi.fn();
        const open = vi.fn();

        rooms.on('room:players', players);
        rooms.on('room:game', game);
        rooms.on('room:config:open', open);

        client.receive('room:open', { name: 'arena', players: 1, game: 0, open: true });
        client.receive('room:players', { name: 'arena', players: 2 });
        client.receive('room:game', { name: 'arena', game: 1 });
        client.receive('room:config:open', { name: 'arena', open: false });
        client.receive('room:players', { name: 'ghost', players: 9 });

        expect(rooms.get('arena').players).toBe(2);
        expect(rooms.get('arena').game).toBe(1);
        expect(rooms.get('arena').open).toBe(false);
        expect([players, game, open].map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1]);
    });

    it('asks the server to create a room, trimming the name', () => {
        rooms.create(' My room ', '', vi.fn());

        expect(client.last('room:create').data).toEqual({ name: 'My room' });

        rooms.create('Daily', ' Daily Runde ', vi.fn());

        expect(client.last('room:create').data).toEqual({ name: 'Daily', tag: 'Daily Runde' });

        rooms.create();

        expect(client.last('room:create').data).toEqual({ name: '' });
    });

    it('forgets everything when stopped', () => {
        client.receive('room:open', { name: 'arena', players: 1, game: 0, open: true });
        rooms.stop();

        expect(rooms.all().count()).toBe(0);

        client.receive('room:open', { name: 'arena', players: 1, game: 0, open: true });

        expect(rooms.all().count()).toBe(0);
    });
});

describe('RoomRepository', () => {
    const roomPayload = {
        success: true,
        master: 1,
        clients: [
            { id: 1, active: true },
            { id: 2, active: false }
        ],
        room: {
            name: 'arena',
            players: [
                { id: 10, client: 1, name: 'Alice', color: '#ff0000', ready: true },
                { id: 11, client: 2, name: 'Bob', color: '#00ff00', ready: false },
                { id: 12, client: 99, name: 'Ghost', color: '#0000ff', ready: false }
            ],
            config: {
                open: true,
                password: 'hunter2',
                maxScore: 42,
                variables: { bonusRate: 0.4 },
                bonuses: { BonusSelfFast: true }
            }
        },
        messages: [['hello'], ['hi']],
        votes: [{ target: 11, result: 2 }]
    };

    let client: FakeSocketClient;
    let room: RoomRepository;

    beforeEach(() => {
        client = new FakeSocketClient();
        room = new RoomRepository(client as any);
        room.start();
    });

    it('waits for the connection before attaching', () => {
        client.connected = false;
        room = new RoomRepository(client as any);
        room.start();

        client.connected = true;
        client.emit('connected', undefined);
        client.receive('client:add', 5);

        expect(room.clients.getById(5)).not.toBeNull();
    });

    it('joins a room: clients, players, config, messages and votes', () => {
        const talks: any[] = [];
        const votes: any[] = [];

        client.on('room:talk', (e: any) => talks.push(e.detail));
        room.on('vote:new', (e: any) => votes.push(e));

        const joined = vi.fn();

        room.join('arena', null, joined);
        client.answer('room:join', structuredClone(roomPayload));

        expect(joined).toHaveBeenCalledWith({ success: true, room: room.room });
        expect(room.room.name).toBe('arena');
        expect(room.room.config.open).toBe(true);
        expect(room.room.config.password).toBe('hunter2');
        expect(room.room.config.maxScore).toBe(42);
        expect(room.room.config.getVariable('bonusRate')).toBe(0.4);
        expect(room.room.config.getBonus('BonusSelfFast')).toBe(true);
        expect(room.room.players.count()).toBe(2);
        expect(room.master?.id).toBe(1);
        expect(room.master?.master).toBe(true);
        expect(talks).toEqual([['hello'], ['hi']]);
        expect(votes).toHaveLength(1);

        // joining the very same room resolves without a round trip
        const again = vi.fn();

        room.join('arena', null, again);

        expect(client.sent.filter((event) => event.name === 'room:join')).toHaveLength(1);
        expect(again).toHaveBeenCalledWith({ success: true, room: room.room });
    });

    it('reports join failures with a fallback error', () => {
        const failed = vi.fn();

        room.join('closed', 'x', failed);
        client.answer('room:join', { success: false, error: 'Room is closed' });

        expect(failed).toHaveBeenCalledWith({ success: false, name: 'closed', error: 'Room is closed' });

        room.join('broken', null, failed);
        client.answer('room:join', { success: false });

        expect(failed).toHaveBeenLastCalledWith({ success: false, name: 'broken', error: 'Unknown error' });
    });

    it('knows the room master', () => {
        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));

        expect(room.amIMaster()).toBe(true);

        client.receive('room:master', { client: 2 });

        expect(room.amIMaster()).toBe(false);
        expect(room.master?.id).toBe(2);
        expect(room.clients.getById(1)?.master).toBe(false);

        client.receive('room:master', { client: 404 });

        expect(room.master?.id).toBe(2);
    });

    it('tracks clients coming and going', () => {
        client.receive('client:add', 7);

        expect(room.clients.getById(7)).not.toBeNull();

        client.receive('client:remove', 7);

        expect(room.clients.getById(7)).toBeNull();
    });

    it('adds and removes players as the room announces them', () => {
        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));

        const joined = vi.fn();
        const left = vi.fn();

        room.on('player:join', joined);
        room.on('player:leave', left);

        client.receive('room:join', { player: { id: 13, client: 2, name: 'Carol', color: '#000000', ready: false } });

        expect(joined).toHaveBeenCalledTimes(1);
        expect(room.room.players.getById(13)?.name).toBe('Carol');

        client.receive('room:leave', { player: 13 });

        expect(left).toHaveBeenCalledTimes(1);
        expect(room.room.players.getById(13)).toBeNull();
        expect(room.playerCache.getById(13)).not.toBeNull();

        client.receive('room:leave', { player: 404 });

        expect(left).toHaveBeenCalledTimes(1);
    });

    it('applies player color, name and ready updates', () => {
        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));

        const updates: string[] = [];

        for (const name of ['player:color', 'player:name', 'player:ready']) {
            room.on(name, () => updates.push(name));
        }

        client.receive('player:color', { player: 10, color: '#ffdd00' });
        client.receive('player:name', { player: 10, name: 'Alicia' });
        client.receive('player:ready', { player: 10, ready: false });
        client.receive('player:color', { player: 404, color: '#000000' });

        const alice = room.room.players.getById(10);

        expect([alice?.color, alice?.name, alice?.ready]).toEqual(['#ffdd00', 'Alicia', false]);
        expect(updates).toEqual(['player:color', 'player:name', 'player:ready']);
    });

    it('mirrors configuration changes', () => {
        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));

        const seen: string[] = [];

        for (const name of ['room:config:open', 'config:max-score', 'config:variable', 'config:bonus']) {
            room.on(name, () => seen.push(name));
        }

        client.receive('room:config:open', { open: false, password: '' });
        client.receive('room:config:max-score', { maxScore: 100 });
        client.receive('room:config:variable', { variable: 'bonusRate', value: 0.8 });
        client.receive('room:config:bonus', { bonus: 'BonusSelfFast', enabled: false });

        expect(room.room.config.open).toBe(false);
        expect(room.room.config.maxScore).toBe(100);
        expect(room.room.config.getVariable('bonusRate')).toBe(0.8);
        expect(room.room.config.getBonus('BonusSelfFast')).toBe(false);
        expect(seen).toHaveLength(4);
    });

    it('starts a new game in the room and forwards launch events', () => {
        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));

        const launched = vi.fn();
        const cancelled = vi.fn();

        room.on('room:launch:start', launched);
        room.on('room:launch:cancel', cancelled);

        client.receive('room:launch:start', { master: 1 });
        client.receive('room:launch:cancel', {});
        client.receive('room:game:start', undefined);

        expect(launched).toHaveBeenCalledWith({ type: 'room:launch:start', detail: { master: 1 } });
        expect(cancelled).toHaveBeenCalledTimes(1);
        expect(room.room.game).toBeDefined();
    });

    it('tracks kicks and votes, for players in the room and in the cache', () => {
        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));
        client.receive('room:leave', { player: 11 });

        const kicked = vi.fn();
        const voted = vi.fn();

        room.on('room:kick', kicked);
        room.on('vote:new', voted);
        room.on('vote:close', voted);

        client.receive('room:kick', 11);
        client.receive('room:kick', 404);
        client.receive('vote:new', { target: 11, result: 3 });
        client.receive('vote:close', { target: 11, result: 3 });
        client.receive('vote:new', { target: 404, result: 1 });

        expect(kicked).toHaveBeenCalledTimes(1);
        expect(voted).toHaveBeenCalledTimes(2);
        expect(room.playerCache.getById(11)?.vote).toBe(false);
    });

    it('tracks client activity', () => {
        const active = vi.fn();

        room.on('client:activity', active);

        client.receive('client:add', 1);
        client.receive('client:activity', { client: 1, active: false });
        client.receive('client:activity', { client: 404, active: true });

        expect(active).toHaveBeenCalledTimes(1);
        expect(active.mock.calls[0][0].detail.active).toBe(false);
    });

    it('sends player management events', () => {
        const callback = vi.fn();

        room.addPlayer('A very long player name that exceeds the limit', '#ff0000'.repeat(5), callback);

        expect(client.last('player:add').data.name).toHaveLength(Player.maxLength);
        expect(client.last('player:add').data.color).toHaveLength(Player.colorMaxLength);

        room.addPlayer('Short', null, callback);

        expect(client.last('player:add').data).toEqual({ name: 'Short', color: null });

        const bob = new Player(11, new Client(2), 'Bob', '#00ff00', false);

        room.removePlayer(bob, callback);

        expect(client.last('player:remove').data).toEqual({ player: 11 });

        room.kickPlayer(bob, callback);
        client.answer('player:kick', { success: true, kicked: true });

        expect(bob.kicked).toBe(true);

        room.launch();

        expect(client.last('room:launch')).toBeDefined();
    });

    it('sends identity and configuration changes', () => {
        const callback = vi.fn();

        const longName = '  Trimmed and a very long name that goes way beyond  ';

        room.setName(10, longName, callback);

        expect(client.last('room:name').data.name).toBe(longName.substring(0, Player.maxLength).trim());

        room.setReady(10, callback);

        expect(client.last('room:ready').data).toEqual({ player: 10 });

        room.setConfigOpen(1 as any, callback);

        expect(client.last('room:config:open').data).toEqual({ open: true });

        room.setConfigMaxScore('42' as any, callback);

        expect(client.last('room:config:max-score').data).toEqual({ maxScore: 42 });

        room.setConfigVariable('speed', '0.4', callback);

        expect(client.last('room:config:variable').data).toEqual({ variable: 'speed', value: 0.4 });

        room.setConfigBonus('accel', callback);

        expect(client.last('room:config:bonus').data).toEqual({ bonus: 'accel' });
    });

    it('keeps the player color when setting it fails', () => {
        const alice = new Player(10, new Client(1), 'Alice', '#ff0000', true);
        const callback = vi.fn();
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        room.setColor(alice, '#0000ff', callback);
        client.answer('room:color', { success: false });

        expect(alice.color).toBe('#ff0000');
        expect(error).toHaveBeenCalled();

        room.setColor(alice, '#0000ff', callback);
        client.answer('room:color', { success: true, color: '#0000ff' });

        expect(alice.color).toBe('#0000ff');

        room.setColor(alice, '#111111', callback);
        client.answer('room:color', { success: true });

        expect(alice.color).toBe('#0000ff');

        error.mockRestore();
    });

    it('leaves the room and forgets it', () => {
        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));

        const left = vi.fn();

        room.on('room:leave', left);
        room.leave();

        expect(client.last('room:leave')).toBeDefined();
        expect(room.room).toBeNull();
        expect(left).toHaveBeenCalled();

        // events are detached after leaving
        client.receive('client:add', 9);

        expect(room.clients.getById(9)).toBeNull();
    });

    it('errors on room data whose client is gone', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        room.join('arena', null, vi.fn());
        client.answer('room:join', structuredClone(roomPayload));

        expect(error).toHaveBeenCalled();

        error.mockRestore();
    });
});

describe('GameRepository', () => {
    let client: FakeSocketClient;
    let repository: GameRepository;
    let game: any;
    let sounds: string[];
    let emitted: string[];

    beforeEach(() => {
        client = new FakeSocketClient();

        const avatar = {
            id: 1,
            local: true,
            alive: true,
            x: 10,
            y: 20,
            sitOut: vi.fn(),
            rejoin: vi.fn(),
            set: vi.fn(),
            setPositionFromServer: vi.fn(),
            setAngle: vi.fn(),
            addPoint: vi.fn(),
            die: vi.fn(),
            bonusStack: { add: vi.fn() }
        };

        const bonusManager = { bonuses: new Collection(), add: vi.fn(), remove: vi.fn() };

        bonusManager.add.mockImplementation((bonus: any) => bonusManager.bonuses.add(bonus));
        bonusManager.remove.mockImplementation((bonus: any) => bonusManager.bonuses.remove(bonus));

        game = {
            frame: null,
            avatars: new Collection([avatar]),
            bonusManager,
            start: vi.fn(),
            stop: vi.fn(),
            repaint: vi.fn(),
            newRound: vi.fn(),
            endRound: vi.fn(),
            clearTrails: vi.fn(),
            setBorderless: vi.fn(),
            end: vi.fn(),
            removeAvatar: vi.fn(),
            syncAvatars: vi.fn(),
            addAvatar: vi.fn(),
            size: 80,
            onResize: vi.fn(),
            render: null
        };

        sounds = [];
        emitted = [];

        repository = new GameRepository(
            client as any,
            { room: { game }, on: vi.fn(), off: vi.fn() } as any,
            { play: (name: string) => sounds.push(name) } as any
        );
        repository.start();

        for (const name of [
            'game:start',
            'game:stop',
            'round:new',
            'round:end',
            'borderless',
            'stats',
            'end',
            'spectate'
        ]) {
            repository.on(name, () => emitted.push(name));
        }
    });

    it('only starts when a room with a game is present', () => {
        const empty = new GameRepository(new FakeSocketClient() as any, { room: null } as any, {} as any);

        empty.start();

        expect(empty.game).toBeNull();
    });

    it('starts and stops the game and toggles the idle redraw hooks', () => {
        client.receive('position', [1, 10, 20]);

        expect(game.repaint).toHaveBeenCalled();

        client.receive('game:start', undefined);

        expect(game.start).toHaveBeenCalled();
        expect(emitted).toContain('game:start');

        client.receive('position', [1, 10, 20]);

        expect(game.repaint).toHaveBeenCalledTimes(1);

        client.receive('game:stop', undefined);

        expect(game.stop).toHaveBeenCalled();
        expect(emitted).toContain('game:stop');
    });

    it('applies avatar updates: property, position, angle, point and death', () => {
        const avatar = game.avatars.getById(1);

        client.receive('property', [1, 'radius', 12]);
        client.receive('position', [1, 100, 200]);
        client.receive('angle', [1, 45]);
        client.receive('point', 1);
        client.receive('die', [1]);

        expect(avatar.set).toHaveBeenCalledWith('radius', 12);
        expect(avatar.setPositionFromServer).toHaveBeenCalledWith(
            repository.compressor.decompress(100),
            repository.compressor.decompress(200)
        );
        expect(avatar.setAngle).toHaveBeenCalledWith(repository.compressor.decompress(45));
        expect(avatar.addPoint).toHaveBeenCalledWith(10, 20);
        expect(avatar.die).toHaveBeenCalled();
        expect(sounds).toEqual(['death']);

        client.receive('property', [404, 'radius', 12]);
        client.receive('position', [404, 1, 2]);
        client.receive('angle', [404, 1]);
        client.receive('point', 404);
        client.receive('die', [404]);

        expect(avatar.set).toHaveBeenCalledTimes(1);
    });

    it('handles bonuses: pop, clear and stack', () => {
        client.receive('bonus:pop', [7, 100, 200, 'BonusSelfFast']);

        expect(game.bonusManager.add).toHaveBeenCalled();
        expect(sounds).toEqual(['bonus-pop']);

        const popped = game.bonusManager.bonuses.getById(7);

        expect(popped.id).toBe(7);

        client.receive('bonus:clear', 7);
        client.receive('bonus:clear', 404);

        expect(game.bonusManager.remove).toHaveBeenCalledTimes(1);
        expect(sounds).toContain('bonus-clear');

        client.receive('bonus:stack', [1, 'add', 'boost', 500, 1]);
        client.receive('bonus:stack', [404, 'add', 'boost', 500, 1]);

        expect(game.avatars.getById(1).bonusStack.add).toHaveBeenCalledTimes(1);
    });

    it('skips stacks for avatars that are not local', () => {
        game.avatars.getById(1).local = false;

        client.receive('bonus:stack', [1, 'add', 'boost', 500, 1]);

        expect(game.avatars.getById(1).bonusStack.add).not.toHaveBeenCalled();
    });

    it('handles rounds, clear, borderless and stats', () => {
        client.receive('round:new', undefined);
        client.receive('round:end', 1);

        expect(game.newRound).toHaveBeenCalled();
        expect(game.endRound).toHaveBeenCalled();
        expect(game.roundWinner).toBe(game.avatars.getById(1));

        client.receive('round:end', null);

        expect(game.roundWinner).toBeNull();

        client.receive('clear', undefined);
        client.receive('borderless', true);
        client.receive('game:stats', { total: 1 });

        expect(game.clearTrails).toHaveBeenCalled();
        expect(game.setBorderless).toHaveBeenCalledWith(true);
        expect(game.stats).toEqual({ total: 1 });
        expect(emitted).toEqual(expect.arrayContaining(['round:new', 'round:end', 'borderless', 'stats']));
    });

    it('handles game end and avatar leave', () => {
        client.receive('end', undefined);
        client.receive('game:leave', 1);
        client.receive('game:leave', 404);

        expect(game.end).toHaveBeenCalled();
        expect(game.removeAvatar).toHaveBeenCalledTimes(1);
        expect(sounds).toEqual(['win']);
        expect(emitted).toContain('end');
    });

    it('enters spectate mode: running round, new round or waiting', () => {
        client.receive('spectate', { maxScore: 10, inRound: true, rendered: true, size: 80, away: [] });

        expect(game.maxScore).toBe(10);
        expect(game.newRound).toHaveBeenCalledWith(0);
        expect(game.avatars.getById(1).local).toBe(true);
        expect(game.avatars.getById(1).ready).toBe(true);
        expect(emitted).toContain('spectate');

        game.newRound.mockClear();
        client.receive('spectate', { maxScore: 10, inRound: true, rendered: false, size: 80, away: [] });

        expect(game.newRound).toHaveBeenCalledWith();

        game.start.mockClear();
        client.receive('spectate', { maxScore: 10, inRound: false, rendered: false, size: 80, away: [] });

        expect(game.start).toHaveBeenCalled();
    });

    it('takes the size of the map and the absent avatars from the spectate event', () => {
        const avatar = game.avatars.getById(1);

        game.render = {};
        client.receive('spectate', { maxScore: 10, inRound: false, rendered: false, size: 100, away: [1, 404] });

        expect(game.size).toBe(100);
        expect(game.onResize).toHaveBeenCalled();
        expect(avatar.sitOut).toHaveBeenCalled();
    });

    it('lets the avatars sit out and come back, only a living avatar is removed', () => {
        const avatar = game.avatars.getById(1);
        const events: string[] = [];

        repository.on('game:leave', () => events.push('leave'));
        repository.on('game:join', () => events.push('join'));

        avatar.alive = false;
        client.receive('game:leave', 1);

        expect(avatar.sitOut).toHaveBeenCalled();
        expect(game.removeAvatar).not.toHaveBeenCalled();

        client.receive('game:join', 1);
        client.receive('game:join', 404);

        expect(avatar.rejoin).toHaveBeenCalledTimes(1);
        expect(events).toEqual(['leave', 'join']);
    });

    it('gives an avatar to a player that comes in the middle of the game', () => {
        const added: string[] = [];
        const player = { id: 7 };

        game.addAvatar.mockReturnValue({ id: 7 });
        repository.on('game:player', () => added.push('player'));
        repository.onPlayerJoin({ detail: { player } } as any);

        expect(game.addAvatar).toHaveBeenCalledWith(player);
        expect(added).toEqual(['player']);
        expect(game.syncAvatars).toHaveBeenCalled();
    });

    it('stops listening when stopped', () => {
        repository.stop();

        client.receive('game:start', undefined);

        expect(game.start).not.toHaveBeenCalled();
        expect(repository.game).toBeNull();
    });
});
