import { describe, expect, it, vi } from 'vitest';
import { BaseRoom } from './BaseRoom.ts';
import { BasePlayer } from './BasePlayer.ts';

const client = (id: string) => ({ id });

const addPlayer = (room: BaseRoom, id: number, name: string, ready = false): BasePlayer => {
  const p = new BasePlayer(client('c' + id), name, '#5cae24');
  p.ready = ready;
  room.addPlayer(p); // Collection index:true assigns p.id
  return p;
};

describe('BaseRoom', () => {
  it('adds players and answers name availability', () => {
    const room = new BaseRoom('the great conflict');
    addPlayer(room, 1, 'Ann');
    expect(room.players.count()).toBe(1);
    expect(room.isNameAvailable('Ann')).toBe(false);
    expect(room.isNameAvailable('Bob')).toBe(true);
  });

  it('has a config built from the injected class', () => {
    const room = new BaseRoom('r');
    expect(room.config.getMaxScore).toBeTypeOf('function');
    expect(room.config.open).toBe(true);
  });

  it('isReady: no game, >= minPlayer, everyone ready', () => {
    const room = new BaseRoom('r');
    expect(room.isReady()).toBe(false); // 0 players
    const a = addPlayer(room, 1, 'Ann', false);
    expect(room.isReady()).toBe(false); // not ready
    a.toggleReady(true);
    expect(room.isReady()).toBe(true);
    room.newGame();
    expect(room.isReady()).toBe(false); // game running
  });

  it('newGame creates one game, wires close, emits; second call returns null', () => {
    const room = new BaseRoom('r');
    addPlayer(room, 1, 'Ann', true);
    const spy = vi.fn();
    room.on('game:new', spy);

    const g = room.newGame();
    expect(g).not.toBeNull();
    expect(room.game).toBe(g);
    expect(spy).toHaveBeenCalledOnce();
    expect(room.newGame()).toBeNull();
  });

  it('closeGame clears the game, emits game:end, resets clientful players', () => {
    const room = new BaseRoom('r');
    const a = addPlayer(room, 1, 'Ann', true);
    const resetSpy = vi.spyOn(a, 'reset');
    room.newGame();
    const ended = vi.fn();
    room.on('game:end', ended);

    room.closeGame();
    expect(room.game).toBeUndefined();
    expect(ended).toHaveBeenCalledOnce();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('serialize: full vs summary', () => {
    const room = new BaseRoom('r');
    addPlayer(room, 1, 'Ann');
    addPlayer(room, 2, 'Bob');

    const full = room.serialize();
    expect(Array.isArray(full.players)).toBe(true);
    expect(full.config).toBeDefined();
    expect(full.game).toBe(false);
    expect(full.open).toBe(true);

    const summary = room.serialize(false);
    expect(summary.players).toBe(2);
    expect(summary.config).toBeUndefined();
  });
});
