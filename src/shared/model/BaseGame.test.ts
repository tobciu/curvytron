import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseGame, type GameRoom } from './BaseGame.ts';
import { BaseAvatar, type AvatarPlayer } from './BaseAvatar.ts';
import { BaseBonusManager } from '../manager/BaseBonusManager.ts';
import { BaseChat } from '../service/BaseChat.ts';
import { Collection } from '../Collection.ts';

const avatarWith = (over: Partial<BaseAvatar> = {}): BaseAvatar => {
  const p: AvatarPlayer = { id: over.id ?? 1, name: 'p', color: '#5cae24' };
  return Object.assign(new BaseAvatar(p), over);
};

const room = (avatars: BaseAvatar[], cfg: Partial<GameRoom['config']> = {}): GameRoom => ({
  name: 'the room',
  players: new Collection(avatars.map((a) => ({ id: a.id, getAvatar: () => a }))),
  config: {
    getMaxScore: () => 30,
    getBonuses: () => [],
    getVariable: () => 0,
    ...cfg,
  },
});

describe('BaseGame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('builds avatars from the room and sizes the arena by player count', () => {
    const g = new BaseGame(room([avatarWith({ id: 1 }), avatarWith({ id: 2 })]));
    expect(g.avatars.count()).toBe(2);
    expect(g.name).toBe('the room');
    expect(g.maxScore).toBe(30);
    // getSize(2) = round(sqrt(6400 + 1*1280)) = round(87.6)
    expect(g.size).toBe(88);
    expect(g.size).toBe(g.getSize(2));
    expect(g.getSize(1)).toBe(80);
  });

  it('isReady once no present avatar is still loading', () => {
    const a = avatarWith({ id: 1, present: true, ready: false });
    const g = new BaseGame(room([a]));
    expect(g.isReady()).toBe(false);
    a.ready = true;
    expect(g.isReady()).toBe(true);
  });

  it('sortAvatars orders by score descending', () => {
    const g = new BaseGame(
      room([
        avatarWith({ id: 1, score: 3 }),
        avatarWith({ id: 2, score: 9 }),
        avatarWith({ id: 3, score: 1 }),
      ]),
    );
    g.sortAvatars();
    expect(g.avatars.items.map((a) => a.score)).toEqual([9, 3, 1]);
  });

  it('newRound schedules a start after warmupTime and marks inRound', () => {
    const a = avatarWith({ id: 1 });
    const g = new BaseGame(room([a]));
    const onStart = vi.spyOn(g, 'onStart');
    g.newRound();
    expect(g.inRound).toBe(true);
    expect(g.started).toBe(true);
    expect(onStart).not.toHaveBeenCalled();
    vi.advanceTimersByTime(BaseGame.warmupTime);
    expect(onStart).toHaveBeenCalledOnce();
    g.stop();
  });

  it('end() stops and emits once', () => {
    const g = new BaseGame(room([avatarWith({ id: 1 })]));
    const ended = vi.fn();
    g.on('end', ended);
    g.started = true;
    expect(g.end()).toBe(true);
    expect(ended).toHaveBeenCalledWith({ game: g });
    expect(g.end()).toBe(false); // already ended
  });

  it('serialize lists serialized avatars + maxScore', () => {
    const g = new BaseGame(room([avatarWith({ id: 7, score: 4 })]));
    const s = g.serialize();
    expect(s.name).toBe('the room');
    expect(s.maxScore).toBe(30);
    expect(s.players).toHaveLength(1);
  });
});

describe('BaseBonusManager', () => {
  const mk = (id: number) => ({ id, clear: vi.fn() });

  it('add / remove / clear track the collection and clear bonuses', () => {
    const m = new BaseBonusManager({});
    const b = mk(1);
    expect(m.add(b)).toBe(true);
    expect(m.bonuses.count()).toBe(1);
    expect(m.remove(b)).toBe(true);
    expect(b.clear).toHaveBeenCalled();

    m.add(mk(2));
    m.add(mk(3));
    m.clear();
    expect(m.bonuses.count()).toBe(0);
  });
});

describe('BaseChat', () => {
  const msg = (id: number) => ({ id, serialize: () => `m${id}` });

  it('addMessage stores + emits; isValid gates it', () => {
    const chat = new BaseChat();
    const seen = vi.fn();
    chat.on('message', seen);
    expect(chat.addMessage(msg(1))).toBe(true);
    expect(seen).toHaveBeenCalled();

    chat.isValid = () => false;
    expect(chat.addMessage(msg(2))).toBe(false);
    expect(chat.messages.count()).toBe(1);
  });

  it('serialize(max) returns a sparse array (legacy quirk): head slots are holes', () => {
    const chat = new BaseChat();
    for (let i = 1; i <= 5; i++) chat.addMessage(msg(i));
    const out = chat.serialize(2);
    expect(out).toHaveLength(5);
    expect(out[3]).toBe('m4');
    expect(out[4]).toBe('m5');
    expect(3 in out).toBe(true);
    expect(0 in out).toBe(false); // hole
  });
});
