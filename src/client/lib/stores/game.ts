import { get, writable } from 'svelte/store';
import { Collection } from '@shared/Collection.ts';
import { BaseGame, type GameRoom } from '@shared/model/BaseGame.ts';
import { Compressor } from '@shared/service/Compressor.ts';
import { socket } from '../socket/client.ts';
import type { ServerToClient } from '../socket/events.ts';
import { profile } from './profile.ts';
import { room, type RoomState } from './room.ts';
import { Game, type GameCanvases } from '../../model/Game.ts';
import { Avatar, type AvatarOwner } from '../../model/Avatar.ts';
import { MapBonus } from '../../model/bonus/MapBonus.ts';
import { StackedBonus } from '../../model/bonus/StackedBonus.ts';
import type { Binding } from '../../model/PlayerInput.ts';

export interface AvatarView {
  id: string | number;
  name: string;
  color: string;
  score: number;
  roundScore: number;
  alive: boolean;
  present: boolean;
  local: boolean;
}

export interface KillLogEntry {
  type: 'wall' | 'suicide' | 'crash' | 'kill';
  dead: { name: string; color: string };
  killer: { name: string; color: string } | null;
}

export type GamePhase = 'loading' | 'waiting' | 'warmup' | 'playing' | 'round-end' | 'game-end';

export interface GameHud {
  name: string;
  maxScore: number;
  avatars: AvatarView[];
  recap: AvatarView[];
  phase: GamePhase;
  warmupCount: number;
  tieBreak: boolean;
  roundWinner: { name: string; color: string } | null;
  gameWinner: { name: string; color: string } | null;
  killLog: KillLogEntry[];
  waiting: { id: string | number; name: string; color: string }[];
  borderless: boolean;
  spectating: boolean;
  latency: number;
  fps: number;
  spectators: number;
}

const emptyHud = (): GameHud => ({
  name: '',
  maxScore: 0,
  avatars: [],
  recap: [],
  phase: 'loading',
  warmupCount: 0,
  tieBreak: false,
  roundWinner: null,
  gameWinner: null,
  killLog: [],
  waiting: [],
  borderless: false,
  spectating: false,
  latency: 0,
  fps: 0,
  spectators: 0,
});

/** A player entry for the client game — the minimum {@link Avatar} needs. */
class GamePlayer implements AvatarOwner {
  avatar: Avatar | null = null;

  constructor(
    readonly id: string | number,
    readonly name: string,
    readonly color: string,
    readonly local: boolean,
    private readonly binding: Binding[],
  ) {}

  getBinding(): Binding[] {
    return this.binding;
  }

  getAvatar(): Avatar {
    if (!this.avatar) {
      this.avatar = new Avatar(this);
    }
    return this.avatar;
  }
}

function buildGameRoom(state: RoomState, binding: Binding[]): GameRoom {
  const players = state.players.map(
    (p) =>
      new GamePlayer(
        p.id,
        p.name,
        p.color,
        state.localPlayerIds.includes(p.id),
        binding,
      ),
  );

  return {
    name: state.name,
    players: new Collection(players),
    config: {
      getMaxScore: () =>
        state.config.maxScore ? state.config.maxScore : Math.max(1, (players.length - 1) * 10),
      getBonuses: () =>
        Object.entries(state.config.bonuses)
          .filter(([, on]) => on)
          .map(([name]) => name)
          .sort(),
      getVariable: (name: string) => state.config.variables[name],
    },
  };
}

function toView(a: Avatar): AvatarView {
  return {
    id: a.id,
    name: a.name,
    color: a.color,
    score: a.score,
    roundScore: a.roundScore,
    alive: a.alive,
    present: a.present,
    local: a.local,
  };
}

function createGameStore() {
  const store = writable<GameHud>(emptyHud());
  const compressor = new Compressor();

  let game: Game | null = null;
  let idle = true;
  const ready = new Set<string | number>();
  let warmupTimer: ReturnType<typeof setInterval> | null = null;
  let fpsTimer: ReturnType<typeof setInterval> | null = null;
  let attached = false;

  const patch = (fn: (h: GameHud) => Partial<GameHud> | void) =>
    store.update((h) => {
      const next = fn(h);
      return next ? { ...h, ...next } : h;
    });

  const refresh = () => {
    if (!game) {
      return;
    }
    const avatars = game.avatars.items.map(toView);
    const recap = [...avatars].sort((a, b) => b.score - a.score);
    patch(() => ({
      avatars,
      recap,
      waiting: game!.avatars.items
        .filter((a) => a.present && !ready.has(a.id))
        .map((a) => ({ id: a.id, name: a.name, color: a.color })),
    }));
  };

  const clearWarmup = () => {
    if (warmupTimer) {
      clearInterval(warmupTimer);
      warmupTimer = null;
    }
  };

  const startWarmup = () => {
    clearWarmup();
    let count = BaseGame.warmupTime / 1000;
    patch(() => ({ phase: 'warmup', warmupCount: count }));
    warmupTimer = setInterval(() => {
      count -= 1;
      patch(() => ({ warmupCount: count }));
      if (count <= 0) {
        clearWarmup();
        patch((h) => ({ phase: h.phase === 'warmup' ? 'playing' : h.phase }));
      }
    }, 1000);
  };

  // --- socket handlers --------------------------------------------------
  const idleRepaint = () => {
    if (game && !game.frame) {
      game.repaint();
    }
  };

  const byId = (id: string | number): Avatar | null => game?.avatars.getById(id) ?? null;

  const h = {
    'game:start': () => {
      game?.start();
      idle = false;
      patch(() => ({ phase: 'playing' }));
    },
    'game:stop': () => {
      game?.stop();
      idle = true;
    },
    'property': (d: ServerToClient['property']) => {
      byId(d[0])?.set(d[1], d[2]);
      if (idle) {
        idleRepaint();
      }
    },
    'position': (d: ServerToClient['position']) => {
      byId(d[0])?.setPositionFromServer(compressor.decompress(d[1]), compressor.decompress(d[2]));
      if (idle) {
        idleRepaint();
      }
    },
    'angle': (d: ServerToClient['angle']) => {
      byId(d[0])?.setAngle(compressor.decompress(d[1]));
      if (idle) {
        idleRepaint();
      }
    },
    'point': (d: ServerToClient['point']) => {
      const a = byId(d);
      if (a) {
        a.addPoint(a.x, a.y);
      }
    },
    'die': (d: ServerToClient['die']) => {
      const dead = byId(d[0]);
      if (!dead) {
        return;
      }
      dead.die();
      const killer = d[1] != null ? byId(d[1]) : null;
      const type: KillLogEntry['type'] = !killer
        ? 'wall'
        : killer.id === dead.id
          ? 'suicide'
          : d[2]
            ? 'crash'
            : 'kill';
      patch((cur) => ({
        killLog: [
          {
            type,
            dead: { name: dead.name, color: dead.color },
            killer: killer ? { name: killer.name, color: killer.color } : null,
          },
          ...cur.killLog,
        ].slice(0, 5),
      }));
      refresh();
    },
    'score': (d: ServerToClient['score']) => {
      byId(d[0])?.setScore(d[1]);
      refresh();
    },
    'score:round': (d: ServerToClient['score:round']) => {
      byId(d[0])?.setRoundScore(d[1]);
      refresh();
    },
    'bonus:pop': (d: ServerToClient['bonus:pop']) => {
      if (!game) {
        return;
      }
      game.bonusManager.add(
        new MapBonus(
          d[0],
          compressor.decompress(d[1]),
          compressor.decompress(d[2]),
          game.bonusManager.assets[d[3]],
        ),
      );
    },
    'bonus:clear': (d: ServerToClient['bonus:clear']) => {
      const bonus = game?.bonusManager.bonuses.getById(d);
      if (bonus && game) {
        game.bonusManager.remove(bonus);
      }
    },
    'bonus:stack': (d: ServerToClient['bonus:stack']) => {
      const avatar = byId(d[0]);
      if (avatar && avatar.local) {
        const bonus = new StackedBonus(d[2], game?.bonusManager.assets[d[3]], d[4]);
        if (d[1] === 'add') {
          avatar.bonusStack.add(bonus);
        } else {
          avatar.bonusStack.remove(bonus);
        }
      }
    },
    'round:new': () => {
      ready.clear();
      game?.newRound();
      game!.roundWinner = null;
      patch(() => ({
        roundWinner: null,
        gameWinner: null,
        tieBreak: game ? game.isTieBreak() : false,
      }));
      startWarmup();
      refresh();
    },
    'round:end': (d: ServerToClient['round:end']) => {
      game?.endRound();
      const winner = d != null ? byId(d) : null;
      if (game) {
        game.roundWinner = winner;
      }
      clearWarmup();
      patch(() => ({
        phase: 'round-end',
        roundWinner: winner ? { name: winner.name, color: winner.color } : null,
      }));
      refresh();
    },
    'clear': () => game?.clearTrails(),
    'borderless': (d: ServerToClient['borderless']) => {
      game?.setBorderless(d);
      patch(() => ({ borderless: !!d }));
    },
    'end': () => {
      game?.end();
      const winner = game?.avatars.getFirst() ?? null;
      clearWarmup();
      patch(() => ({
        phase: 'game-end',
        gameWinner: winner ? { name: winner.name, color: winner.color } : null,
      }));
      refresh();
    },
    'game:leave': (d: ServerToClient['game:leave']) => {
      const a = byId(d);
      if (a && game) {
        game.removeAvatar(a);
        refresh();
      }
    },
    'game:spectators': (d: ServerToClient['game:spectators']) =>
      patch(() => ({ spectators: d })),
    'latency': (d: ServerToClient['latency']) => patch(() => ({ latency: d })),
    'ready': (d: unknown) => {
      ready.add(d as string | number);
      refresh();
    },
    'spectate': (d: ServerToClient['spectate']) => {
      if (!game) {
        return;
      }
      game.maxScore = d.maxScore;
      for (const a of game.avatars.items) {
        a.local = true;
        a.ready = true;
      }
      if (d.inRound) {
        game.newRound(d.rendered ? 0 : undefined);
      } else {
        game.start();
      }
      patch(() => ({ spectating: true, maxScore: d.maxScore }));
    },
  } as const;

  const attach = () => {
    if (attached) {
      return;
    }
    attached = true;
    for (const [name, fn] of Object.entries(h)) {
      socket.on(name as keyof ServerToClient, fn as (d: unknown) => void);
    }
  };

  const detach = () => {
    if (!attached) {
      return;
    }
    attached = false;
    for (const [name, fn] of Object.entries(h)) {
      socket.off(name as keyof ServerToClient, fn as (d: unknown) => void);
    }
  };

  const onMove = (e: { avatar: { id: string | number }; move: -1 | 1 | false }) => {
    socket.emit('player:move', { avatar: e.avatar.id, move: e.move ? e.move : false });
  };

  return {
    subscribe: store.subscribe,

    /** Build the game from the current room state and start listening. */
    start(name: string): boolean {
      const state = get(room);
      if (!state || state.name !== name) {
        return false;
      }

      const binding = get(profile).controls as Binding[];
      game = new Game(buildGameRoom(state, binding));

      for (const avatar of game.avatars.items) {
        avatar.input?.on('move', onMove as (e: unknown) => void);
      }

      attach();

      // hand-shake: tell the server we're ready once the bonus sprite is in
      const sendReady = () => socket.emit('ready');
      if (game.bonusManager.loaded) {
        sendReady();
      } else {
        game.bonusManager.once('load', sendReady);
      }

      fpsTimer = setInterval(() => patch(() => ({ fps: game?.fps.frequency ?? 0 })), 1000);

      patch(() => ({
        name: state.name,
        maxScore: game!.maxScore,
        phase: game!.isReady() ? 'playing' : 'waiting',
      }));
      refresh();
      return true;
    },

    /** The Svelte component hands us its canvas elements once mounted. */
    attachCanvases(els: GameCanvases): void {
      game?.attachCanvases(els);
    },

    resize(width: number): void {
      game?.setDimensions(width);
    },

    isReady: () => (game ? game.isReady() : false),

    destroy(): void {
      detach();
      clearWarmup();
      if (fpsTimer) {
        clearInterval(fpsTimer);
        fpsTimer = null;
      }
      if (game) {
        for (const avatar of game.avatars.items) {
          avatar.input?.off('move', onMove as (e: unknown) => void);
          avatar.input?.detachEvents();
        }
        game.stop();
        game = null;
      }
      ready.clear();
      idle = true;
      store.set(emptyHud());
    },
  };
}

export const gameStore = createGameStore();
