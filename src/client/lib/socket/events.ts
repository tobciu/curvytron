/**
 * The Curvytron wire events, by direction. Payload types are pragmatic (not yet
 * exhaustive) — tighten as screens migrate. Full reference: doc/protocol.md.
 */

/** Events the client sends. `request(name, data)` expects a `{ success: boolean }`-ish reply. */
export interface ClientToServer {
  'whoami': null;
  'room:fetch': undefined;
  'room:create': { name: string };
  'room:join': { name: string; password?: string };
  'room:leave': undefined;
  'room:talk': string;
  'player:add': { name: string; color?: string };
  'player:remove': { player: number | string };
  'player:kick': { player: number | string };
  'room:ready': { player: number | string };
  'room:color': { player: number | string; color: string };
  'room:name': { player: number | string; name: string };
  'activity': boolean;
  'room:config:open': { open: boolean };
  'room:config:max-score': { maxScore: number };
  'room:config:variable': { variable: string; value: number };
  'room:config:bonus': { bonus: string };
  'room:launch': undefined;
  'ready': undefined;
  'player:move': { avatar: number | string; move: -1 | 1 | false };
  'latency': number;
}

/** Events the client receives (name → payload). */
export interface ServerToClient {
  // connection
  'connected': undefined;
  'disconnected': undefined;
  'latency': number;
  'client:activity': { client: number | string; active: boolean };
  // lobby
  'room:open': { name: string; players: number; game: boolean; open: boolean };
  'room:close': { name: string };
  'room:players': { name: string; players: number };
  'room:game': { name: string; game: boolean };
  // in-room
  'client:add': { client: { id: number | string; active: boolean } } | (number | string);
  'client:remove': number | string;
  'room:master': { client: number | string };
  'room:join': { player: SerializedPlayer };
  'room:leave': { player: number | string };
  'room:talk': SerializedMessage;
  'player:color': { player: number | string; color: string };
  'player:name': { player: number | string; name: string };
  'player:ready': { player: number | string; ready: boolean };
  'room:config:open': { open: boolean; password: string | null };
  'room:config:max-score': { maxScore: number | null };
  'room:config:variable': { variable: string; value: number };
  'room:config:bonus': { bonus: string; enabled: boolean };
  'room:launch:start': undefined;
  'room:launch:cancel': undefined;
  'room:kick': number | string;
  'vote:new': { target: number | string; result: boolean };
  'vote:close': { target: number | string; result: boolean };
  'room:game:start': undefined;
  // in-game
  'ready': number | string;
  'game:start': undefined;
  'game:stop': undefined;
  'round:new': undefined;
  'round:end': (number | string) | null;
  'clear': undefined;
  'borderless': boolean;
  'end': undefined;
  'game:leave': number | string;
  'game:spectators': number;
  'spectate': { inRound: boolean; rendered: boolean; maxScore: number };
  'position': [number | string, number, number];
  'angle': [number | string, number];
  'point': number | string;
  'die': [number | string, (number | string) | null, unknown];
  'score': [number | string, number];
  'score:round': [number | string, number];
  'property': [number | string, string, unknown];
  'bonus:pop': [number, number, number, string];
  'bonus:clear': number;
  'bonus:stack': [number | string, 'add' | 'remove', number, string, number];
}

export interface SerializedPlayer {
  client: number | string;
  id: number | string;
  name: string;
  color: string;
  ready: boolean;
  active?: boolean;
}

export interface SerializedMessage {
  client: number | string;
  content: string;
  creation: number;
  name: string | null;
  color: string | null;
}

export interface RpcReply {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}
