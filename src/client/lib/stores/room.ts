import { writable, get } from 'svelte/store';
import { socket } from '../socket/client.ts';
import type { RpcReply, SerializedMessage, SerializedPlayer, ServerToClient } from '../socket/events.ts';
import { go, href } from '../router.ts';

export interface RoomConfigState {
  maxScore: number | null;
  variables: Record<string, number>;
  bonuses: Record<string, boolean>;
}

export interface RoomState {
  name: string;
  open: boolean;
  password: string | null;
  config: RoomConfigState;
  master: string | number | null;
  clients: { id: string | number; active: boolean }[];
  players: SerializedPlayer[];
  messages: SerializedMessage[];
  votes: { target: string | number; result: boolean }[];
  launching: boolean;
  /** players added by *this* client (can be removed / readied locally). */
  localPlayerIds: (string | number)[];
}

const empty = (name: string): RoomState => ({
  name,
  open: true,
  password: null,
  config: { maxScore: null, variables: {}, bonuses: {} },
  master: null,
  clients: [],
  players: [],
  messages: [],
  votes: [],
  launching: false,
  localPlayerIds: [],
});

function createRoomStore() {
  const store = writable<RoomState | null>(null);
  let joined: string | null = null;
  const clientId = () => get(socket.clientId);

  const set = (fn: (r: RoomState) => void) =>
    store.update((r) => {
      if (r) {
        fn(r);
      }
      return r;
    });

  // --- broadcast handlers -------------------------------------------------
  const h = {
    'client:add': (d: ServerToClient['client:add']) =>
      set((r) => {
        if (typeof d === 'object' && 'client' in d) {
          if (!r.clients.some((c) => c.id === d.client.id)) {
            r.clients = [...r.clients, d.client];
          }
        }
      }),
    'client:remove': (id: ServerToClient['client:remove']) =>
      set((r) => {
        r.clients = r.clients.filter((c) => c.id !== id);
      }),
    'client:activity': (d: ServerToClient['client:activity']) =>
      set((r) => {
        const c = r.clients.find((x) => x.id === d.client);
        if (c) {
          c.active = d.active;
        }
      }),
    'room:master': (d: ServerToClient['room:master']) => set((r) => (r.master = d.client)),
    'room:join': (d: ServerToClient['room:join']) =>
      set((r) => {
        if (!r.players.some((p) => p.id === d.player.id)) {
          r.players = [...r.players, d.player];
        }
      }),
    'room:leave': (d: ServerToClient['room:leave']) =>
      set((r) => {
        r.players = r.players.filter((p) => p.id !== d.player);
        r.localPlayerIds = r.localPlayerIds.filter((id) => id !== d.player);
      }),
    'player:ready': (d: ServerToClient['player:ready']) =>
      set((r) => {
        const p = r.players.find((x) => x.id === d.player);
        if (p) {
          p.ready = d.ready;
        }
      }),
    'player:color': (d: ServerToClient['player:color']) =>
      set((r) => {
        const p = r.players.find((x) => x.id === d.player);
        if (p) {
          p.color = d.color;
        }
      }),
    'player:name': (d: ServerToClient['player:name']) =>
      set((r) => {
        const p = r.players.find((x) => x.id === d.player);
        if (p) {
          p.name = d.name;
        }
      }),
    'room:talk': (m: SerializedMessage) => set((r) => (r.messages = [...r.messages, m])),
    'room:config:open': (d: ServerToClient['room:config:open']) =>
      set((r) => {
        r.open = d.open;
        r.password = d.password;
      }),
    'room:config:max-score': (d: ServerToClient['room:config:max-score']) =>
      set((r) => (r.config.maxScore = d.maxScore)),
    'room:config:variable': (d: ServerToClient['room:config:variable']) =>
      set((r) => (r.config.variables[d.variable] = d.value)),
    'room:config:bonus': (d: ServerToClient['room:config:bonus']) =>
      set((r) => (r.config.bonuses[d.bonus] = d.enabled)),
    'room:launch:start': () => set((r) => (r.launching = true)),
    'room:launch:cancel': () => set((r) => (r.launching = false)),
    'vote:new': (v: ServerToClient['vote:new']) =>
      set((r) => (r.votes = [...r.votes.filter((x) => x.target !== v.target), v])),
    'vote:close': (v: ServerToClient['vote:close']) =>
      set((r) => (r.votes = r.votes.filter((x) => x.target !== v.target))),
    'room:kick': (id: ServerToClient['room:kick']) =>
      set((r) => {
        r.players = r.players.filter((p) => p.id !== id);
      }),
    'room:game:start': () => {
      if (joined) {
        go(href.game(joined).slice(1));
      }
    },
  } as const;

  const attach = () => {
    for (const [name, fn] of Object.entries(h)) {
      socket.on(name as keyof ServerToClient, fn as (d: unknown) => void);
    }
  };
  const detach = () => {
    for (const [name, fn] of Object.entries(h)) {
      socket.off(name as keyof ServerToClient, fn as (d: unknown) => void);
    }
  };

  return {
    subscribe: store.subscribe,

    async join(name: string, password?: string): Promise<RpcReply> {
      if (joined === name) {
        return { success: true };
      }
      const res = await socket.request('room:join', { name, password });
      if (res.success && res.room) {
        const room = res.room as {
          name: string;
          open: boolean;
          config: RoomConfigState & { password: string | null };
          players: SerializedPlayer[];
        };
        const state = empty(name);
        state.name = room.name;
        state.open = room.open;
        state.password = room.config.password;
        state.config = {
          maxScore: room.config.maxScore,
          variables: room.config.variables,
          bonuses: room.config.bonuses,
        };
        state.players = room.players ?? [];
        state.master = (res.master as string | number | null) ?? null;
        state.clients = (res.clients as RoomState['clients']) ?? [];
        state.messages = (res.messages as SerializedMessage[]) ?? [];
        state.votes = (res.votes as RoomState['votes']) ?? [];
        store.set(state);
        joined = name;
        attach();
      }
      return res;
    },

    leave() {
      if (!joined) {
        return;
      }
      socket.emit('room:leave');
      detach();
      joined = null;
      store.set(null);
    },

    isMaster: () => {
      const r = get(store);
      return r != null && r.master != null && r.master === clientId();
    },

    async addPlayer(name: string, color?: string): Promise<RpcReply> {
      const res = await socket.request('player:add', { name, color });
      // the server echoes the player via a room:join broadcast; mark it local
      if (res.success) {
        setTimeout(() => {
          set((r) => {
            const mine = r.players.filter((p) => p.client === clientId());
            r.localPlayerIds = mine.map((p) => p.id);
          });
        }, 50);
      }
      return res;
    },

    removePlayer: (id: string | number) => socket.request('player:remove', { player: id }),
    toggleReady: (id: string | number) => socket.request('room:ready', { player: id }),
    setColor: (id: string | number, color: string) =>
      socket.request('room:color', { player: id, color }),
    setName: (id: string | number, name: string) =>
      socket.request('room:name', { player: id, name }),
    talk: (content: string) => socket.request('room:talk', content),
    kick: (id: string | number) => socket.request('player:kick', { player: id }),
    launch: () => socket.emit('room:launch'),

    // master-only config
    setOpen: (open: boolean) => socket.request('room:config:open', { open }),
    setMaxScore: (maxScore: number) => socket.request('room:config:max-score', { maxScore }),
    setVariable: (variable: string, value: number) =>
      socket.request('room:config:variable', { variable, value }),
    toggleBonus: (bonus: string) => socket.request('room:config:bonus', { bonus }),
  };
}

export const room = createRoomStore();
